begin;

select plan(35);

select has_view('public', 'goal_daily_focus', 'goal daily focus view exists');
select has_column('public', 'goal_daily_focus', 'user_id', 'goal daily focus exposes user id');
select col_type_is('public', 'goal_daily_focus', 'user_id', 'uuid', 'goal daily focus user id is uuid');
select has_column('public', 'goal_daily_focus', 'goal_id', 'goal daily focus exposes goal id');
select col_type_is('public', 'goal_daily_focus', 'goal_id', 'uuid', 'goal daily focus goal id is uuid');
select has_column('public', 'goal_daily_focus', 'focus_date', 'goal daily focus exposes focus date');
select col_type_is('public', 'goal_daily_focus', 'focus_date', 'date', 'goal daily focus date is date');
select has_column('public', 'goal_daily_focus', 'honest_minutes', 'goal daily focus exposes honest minutes');
select col_type_is('public', 'goal_daily_focus', 'honest_minutes', 'integer', 'goal daily focus honest minutes are integer');
select has_column('public', 'goal_daily_focus', 'earned_blocks', 'goal daily focus exposes earned blocks');
select col_type_is('public', 'goal_daily_focus', 'earned_blocks', 'integer', 'goal daily focus earned blocks are integer');
select has_column('public', 'goal_daily_focus', 'sessions_ended', 'goal daily focus exposes ended sessions');
select col_type_is('public', 'goal_daily_focus', 'sessions_ended', 'integer', 'goal daily focus ended sessions are integer');

select has_view('public', 'daily_focus_trend', 'daily focus trend view exists');
select has_column('public', 'daily_focus_trend', 'user_id', 'daily focus trend exposes user id');
select col_type_is('public', 'daily_focus_trend', 'user_id', 'uuid', 'daily focus trend user id is uuid');
select has_column('public', 'daily_focus_trend', 'focus_date', 'daily focus trend exposes focus date');
select col_type_is('public', 'daily_focus_trend', 'focus_date', 'date', 'daily focus trend date is date');
select has_column('public', 'daily_focus_trend', 'honest_minutes', 'daily focus trend exposes honest minutes');
select col_type_is('public', 'daily_focus_trend', 'honest_minutes', 'integer', 'daily focus trend honest minutes are integer');
select has_column('public', 'daily_focus_trend', 'earned_blocks', 'daily focus trend exposes earned blocks');
select col_type_is('public', 'daily_focus_trend', 'earned_blocks', 'integer', 'daily focus trend earned blocks are integer');
select has_column('public', 'daily_focus_trend', 'completed_sessions', 'daily focus trend exposes completed sessions');
select col_type_is('public', 'daily_focus_trend', 'completed_sessions', 'integer', 'daily focus trend completed sessions are integer');
select has_column('public', 'daily_focus_trend', 'abandoned_sessions', 'daily focus trend exposes abandoned sessions');
select col_type_is('public', 'daily_focus_trend', 'abandoned_sessions', 'integer', 'daily focus trend abandoned sessions are integer');

select ok(
  coalesce((
    select 'security_invoker=true' = any(pg_class.reloptions)
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public' and pg_class.relname = 'goal_daily_focus'
  ), false),
  'goal daily focus runs with the caller RLS context'
);
select ok(
  coalesce((
    select 'security_invoker=true' = any(pg_class.reloptions)
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public' and pg_class.relname = 'daily_focus_trend'
  ), false),
  'daily focus trend runs with the caller RLS context'
);

-- Create fixtures as postgres before switching to authenticated for view assertions.
insert into public.goals (id, owner_id, title, identity_role)
values (
  '18000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Daily focus fixture',
  'Builder'
);

insert into public.tasks (id, owner_id, title, status, goal_id, estimated_blocks)
values (
  '28000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Daily focus task',
  'done',
  '18000000-0000-0000-0000-000000000001'::uuid,
  2
);

insert into public.sessions (
  id, owner_id, task_id, started_at, ended_at, planned_minutes,
  outcome, distraction_tag, honest_minutes
)
values
  (
    '58000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '28000000-0000-0000-0000-000000000001'::uuid,
    (((now() at time zone 'UTC')::date)::timestamp + interval '1 hour') at time zone 'UTC',
    (((now() at time zone 'UTC')::date)::timestamp + interval '1 hour 25 minutes') at time zone 'UTC',
    25, 'completed', null, 25
  ),
  (
    '58000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '28000000-0000-0000-0000-000000000001'::uuid,
    (((now() at time zone 'UTC')::date)::timestamp + interval '2 hours') at time zone 'UTC',
    (((now() at time zone 'UTC')::date)::timestamp + interval '2 hours 7 minutes') at time zone 'UTC',
    25, 'abandoned', 'energy', 7
  );

insert into public.goals (id, owner_id, title, identity_role)
values (
  '18000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Other user private goal',
  'Builder'
);

insert into public.tasks (id, owner_id, title, status, goal_id, estimated_blocks)
values (
  '28000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid,
  'Other user private task',
  'done',
  '18000000-0000-0000-0000-000000000002'::uuid,
  1
);

insert into public.sessions (
  id, owner_id, task_id, started_at, ended_at, planned_minutes,
  outcome, distraction_tag, honest_minutes
)
values (
  '58000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid,
  '28000000-0000-0000-0000-000000000002'::uuid,
  (((now() at time zone 'UTC')::date)::timestamp + interval '3 hours') at time zone 'UTC',
  (((now() at time zone 'UTC')::date)::timestamp + interval '3 hours 25 minutes') at time zone 'UTC',
  25, 'completed', null, 25
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

select is(
  (select count(*) from public.goal_daily_focus
   where goal_id = '18000000-0000-0000-0000-000000000001'::uuid),
  7::bigint,
  'goal daily focus emits exactly seven rows per goal'
);
select is(
  (select earned_blocks from public.goal_daily_focus
   where goal_id = '18000000-0000-0000-0000-000000000001'::uuid
     and focus_date = (now() at time zone 'UTC')::date),
  1,
  'goal daily focus counts earned blocks from completed sessions only'
);
select is(
  (select honest_minutes from public.goal_daily_focus
   where goal_id = '18000000-0000-0000-0000-000000000001'::uuid
     and focus_date = (now() at time zone 'UTC')::date),
  32,
  'goal daily focus sums honest minutes from completed and abandoned sessions'
);
select is(
  (select count(*) from public.goal_daily_focus
   where goal_id = '18000000-0000-0000-0000-000000000001'::uuid
     and focus_date = (now() at time zone 'UTC')::date - 1
     and honest_minutes = 0
     and earned_blocks = 0
     and sessions_ended = 0),
  1::bigint,
  'goal daily focus preserves an empty day as a zero row'
);
select is(
  (select count(*) from public.daily_focus_trend),
  7::bigint,
  'daily focus trend emits exactly seven rows for the caller'
);
select ok(
  not exists (
    select 1 from public.goal_daily_focus
    where user_id = '00000000-0000-0000-0000-000000000003'::uuid
       or goal_id = '18000000-0000-0000-0000-000000000002'::uuid
  ),
  'goal daily focus hides another user rows'
);
select ok(
  not exists (
    select 1 from public.daily_focus_trend
    where user_id = '00000000-0000-0000-0000-000000000003'::uuid
  ),
  'daily focus trend hides another user rows'
);

select * from finish();
rollback;
