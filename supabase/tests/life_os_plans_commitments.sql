begin;

select plan(43);

select has_table('public', 'plans', 'plans table exists');
select has_table('public', 'commitments', 'commitments table exists');
select has_column('public', 'profiles', 'time_zone', 'profiles store an owner time zone');
select col_not_null('public', 'profiles', 'time_zone', 'profile time zone has a UTC fallback');
select has_column('public', 'plans', 'legacy_morning_task_ids', 'day plans preserve exact morning ids');
select has_column('public', 'plans', 'legacy_commitment_issues', 'day plans preserve invalid history issues');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.plans'::regclass),
  'plans have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.commitments'::regclass),
  'commitments have RLS enabled'
);

select throws_ok(
  $$update public.profiles
    set time_zone = 'Mars/Olympus_Mons'
    where id = '00000000-0000-0000-0000-000000000001'::uuid$$,
  '23514',
  'profile time_zone must be a recognized IANA time zone',
  'invalid time zones are rejected'
);
select lives_ok(
  $$update public.profiles
    set time_zone = 'Asia/Kolkata'
    where id = '00000000-0000-0000-0000-000000000001'::uuid$$,
  'an IANA time zone is accepted'
);
select is(
  public.owner_local_date(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-07-31 20:00:00+00'::timestamptz
  ),
  '2026-08-01'::date,
  'Today is owner local after non-UTC midnight'
);
select is(
  public.owner_iso_week_start(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '2026-07-31 20:00:00+00'::timestamptz
  ),
  '2026-07-27'::date,
  'the owner-local ISO week uses the same midnight boundary as Today'
);

select public.ensure_owner_plan(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'day',
  '2026-08-01'::date
);

select is(
  (select starts_on from public.plans
   where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
     and horizon = 'week'
     and id = (
       select parent_plan_id from public.plans
       where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
         and horizon = 'day' and starts_on = '2026-08-01'::date
     )),
  '2026-07-27'::date,
  'a day parent is the weekday-robust ISO Monday'
);
select is(
  (select starts_on from public.plans
   where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
     and horizon = 'month'
     and id = (
       select parent_plan_id from public.plans
       where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
         and horizon = 'week' and starts_on = '2026-07-27'::date
     )),
  '2026-07-01'::date,
  'the ISO week belongs to the month containing its Monday'
);
select is(
  (select count(*) from public.plans
   where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
     and horizon in ('year', 'quarter', 'month', 'week', 'day')
     and starts_on in (
       '2026-01-01'::date, '2026-07-01'::date, '2026-07-27'::date, '2026-08-01'::date
     )),
  5::bigint,
  'ancestor creation produces the complete hierarchy'
);
select is(
  public.ensure_owner_plan(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'day',
    '2026-08-01'::date
  ),
  (select id from public.plans
   where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
     and horizon = 'day' and starts_on = '2026-08-01'::date),
  'ancestor creation is idempotent'
);
select throws_ok(
  $$insert into public.plans (owner_id, horizon, starts_on, parent_plan_id)
    select owner_id, horizon, starts_on, parent_plan_id
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'day' and starts_on = '2026-08-01'$$,
  '23505',
  null,
  'an owner has only one plan per horizon and calendar key'
);
select throws_ok(
  $$insert into public.plans (owner_id, horizon, starts_on)
    values ('00000000-0000-0000-0000-000000000001', 'week', '2026-08-01')$$,
  '23514',
  null,
  'a week must start on ISO Monday'
);
select throws_ok(
  $$update public.plans set starts_on = starts_on + 1
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'day' and starts_on = '2026-08-01'$$,
  '23514',
  'plan calendar identity and parent are immutable',
  'plan calendar identity is immutable'
);
select throws_ok(
  $$insert into public.plans (owner_id, horizon, starts_on, parent_plan_id)
    select '00000000-0000-0000-0000-000000000001', 'day', '2026-08-02', id
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'month' and starts_on = '2026-07-01'$$,
  '23514',
  'plan parent must be the same-owner next horizon containing starts_on',
  'a manually supplied wrong parent horizon is rejected'
);
select throws_ok(
  $$insert into public.plans (owner_id, horizon, starts_on, parent_plan_id)
    select '00000000-0000-0000-0000-000000000001', 'week', '2026-08-03', id
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'month' and starts_on = '2026-07-01'$$,
  '23514',
  'plan parent must be the same-owner next horizon containing starts_on',
  'a next-horizon parent that does not contain starts_on is rejected'
);

insert into public.tasks (id, owner_id, title, status)
values
  ('23000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Today task', 'inbox'),
  ('23000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Other task', 'inbox');

select lives_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'goal',
           '10000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'year' and starts_on = '2026-01-01'$$,
  'a goal commits at an upper horizon'
);
select lives_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'goal',
           '10000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'quarter' and starts_on = '2026-07-01'$$,
  'a goal commits to a quarter'
);
select lives_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'goal',
           '10000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'month' and starts_on = '2026-07-01'$$,
  'a goal commits to a month'
);
select lives_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'goal',
           '10000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'week' and starts_on = '2026-07-27'$$,
  'a goal commits to a week'
);
select lives_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'goal',
           '10000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'day' and starts_on = '2026-08-01'$$,
  'a goal commits all the way to day'
);
select lives_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'task',
           '23000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'week' and starts_on = '2026-07-27'$$,
  'a task commits to a week'
);
select lives_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'task',
           '23000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'day' and starts_on = '2026-08-01'$$,
  'a task commits to a day'
);
select throws_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'task',
           '23000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'month' and starts_on = '2026-07-01'$$,
  '23514',
  'tasks commit only to week or day plans',
  'a task cannot commit to a month'
);
select throws_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'task',
           '23000000-0000-0000-0000-000000000002'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'day' and starts_on = '2026-08-01'$$,
  '23514',
  'commitment subject must exist and belong to owner',
  'a commitment cannot cross owners'
);
select throws_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'occurrence',
           '24000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'day' and starts_on = '2026-08-01'$$,
  '23503',
  'occurrences table does not exist yet',
  'occurrence commitments wait for the occurrence table'
);
select throws_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', id, 'task',
           '23000000-0000-0000-0000-000000000001'
    from public.plans
    where owner_id = '00000000-0000-0000-0000-000000000001'
      and horizon = 'day' and starts_on = '2026-08-01'$$,
  '23505',
  null,
  'the same subject cannot duplicate within one plan'
);
select throws_ok(
  $$update public.tasks
    set owner_id = '00000000-0000-0000-0000-000000000002'
    where id = '23000000-0000-0000-0000-000000000001'$$,
  '23514',
  'committed subject owner is immutable',
  'a committed task cannot be moved to another owner'
);

select lives_ok(
  $$select public.commit_today_tasks(
      '00000000-0000-0000-0000-000000000001',
      array['23000000-0000-0000-0000-000000000001']::uuid[],
      '2026-07-31 20:00:00+00'::timestamptz
    )$$,
  'Today commit is server-authoritative and idempotent'
);
select is(
  (select count(*) from public.commitments
   where owner_id = '00000000-0000-0000-0000-000000000001'
     and subject_type = 'task'
     and subject_id = '23000000-0000-0000-0000-000000000001'
     and plan_id = (
       select id from public.plans
       where owner_id = '00000000-0000-0000-0000-000000000001'
         and horizon = 'day' and starts_on = '2026-08-01'
     )),
  1::bigint,
  'repeated Today commits retain one subject edge'
);
select is(
  (select scheduled_for from public.tasks
   where id = '23000000-0000-0000-0000-000000000001'),
  '2026-08-01'::date,
  'legacy scheduled_for mirrors the authoritative Today commitment'
);

create temporary table plans_test_ids as
select id as owner_one_day_plan_id
from public.plans
where owner_id = '00000000-0000-0000-0000-000000000001'
  and horizon = 'day'
  and starts_on = '2026-08-01';
grant select on plans_test_ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$update public.profiles set time_zone = 'America/Los_Angeles'
    where id = '00000000-0000-0000-0000-000000000002'$$,
  'an authenticated owner can persist a validated IANA time zone'
);
select is(
  (select count(*) from public.plans
   where owner_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  'RLS hides another owners plans'
);
select is(
  (select count(*) from public.commitments
   where owner_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  'RLS hides another owners commitments'
);
select throws_ok(
  $$select public.ensure_today_plan(
      '00000000-0000-0000-0000-000000000001',
      '2026-07-31 20:00:00+00'
    )$$,
  '42501',
  'cannot ensure another owners plan',
  'an authenticated owner cannot ensure another owners Today'
);
select throws_ok(
  $$insert into public.plans (owner_id, horizon, starts_on)
    values ('00000000-0000-0000-0000-000000000001', 'year', '2030-01-01')$$,
  '42501',
  null,
  'RLS rejects a cross-owner plan write'
);
select throws_ok(
  $$insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select '00000000-0000-0000-0000-000000000001', owner_one_day_plan_id, 'goal',
           '10000000-0000-0000-0000-000000000001'
    from plans_test_ids$$,
  '42501',
  null,
  'RLS rejects a cross-owner commitment write'
);
select is(
  has_table_privilege('service_role', 'public.day_records', 'insert'),
  false,
  'legacy day records are immutable through the service API'
);

select * from finish();
rollback;
