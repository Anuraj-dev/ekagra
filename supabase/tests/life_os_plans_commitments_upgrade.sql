begin;

create temporary table plans_upgrade_fixture (
  owner_id uuid not null,
  other_owner_id uuid not null,
  valid_task_id uuid not null,
  cross_owner_task_id uuid not null,
  missing_task_id uuid not null,
  scheduled_task_id uuid not null,
  record_date date not null,
  scheduled_date date not null,
  original_created_at timestamptz not null,
  original_updated_at timestamptz not null
) on commit preserve rows;

insert into plans_upgrade_fixture
values (
  gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
  gen_random_uuid(), gen_random_uuid(), '2024-02-29', '2024-03-03',
  '2024-02-29 01:02:03+00', '2024-02-29 20:21:22+00'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  owner_id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'plans-upgrade-owner@example.test',
  'test',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
from plans_upgrade_fixture
union all
select
  other_owner_id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'plans-upgrade-other@example.test',
  'test',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
from plans_upgrade_fixture;

insert into public.tasks (id, owner_id, title, status, scheduled_for)
select valid_task_id, owner_id, 'Valid legacy morning task', 'planned', null::date
from plans_upgrade_fixture
union all
select cross_owner_task_id, other_owner_id, 'Cross owner legacy morning task', 'planned', null::date
from plans_upgrade_fixture
union all
select scheduled_task_id, owner_id, 'Legacy scheduled task', 'planned', scheduled_date
from plans_upgrade_fixture;

insert into public.day_records (
  owner_id, record_date, morning_task_ids, plan_match, went_wrong_tag, note,
  created_at, updated_at
)
select
  owner_id,
  record_date,
  array[valid_task_id, cross_owner_task_id, missing_task_id],
  false,
  'scope',
  'Exact legacy reflection',
  original_created_at,
  original_updated_at
from plans_upgrade_fixture;

commit;

\ir life_os_plans_commitments_migration.inc

begin;

select plan(10);

select is(
  (select legacy_morning_task_ids
   from public.plans, plans_upgrade_fixture
   where plans.owner_id = plans_upgrade_fixture.owner_id
     and plans.horizon = 'day'
     and plans.starts_on = plans_upgrade_fixture.record_date),
  (select array[valid_task_id, cross_owner_task_id, missing_task_id]
   from plans_upgrade_fixture),
  'upgrade preserves every morning task id in original order'
);
select is(
  (select legacy_note
   from public.plans, plans_upgrade_fixture
   where plans.owner_id = plans_upgrade_fixture.owner_id
     and plans.horizon = 'day'
     and plans.starts_on = plans_upgrade_fixture.record_date),
  'Exact legacy reflection',
  'upgrade preserves reflection text'
);
select is(
  (select legacy_plan_match
   from public.plans, plans_upgrade_fixture
   where plans.owner_id = plans_upgrade_fixture.owner_id
     and plans.horizon = 'day'
     and plans.starts_on = plans_upgrade_fixture.record_date),
  false,
  'upgrade preserves plan_match'
);
select is(
  (select legacy_record_created_at
   from public.plans, plans_upgrade_fixture
   where plans.owner_id = plans_upgrade_fixture.owner_id
     and plans.horizon = 'day'
     and plans.starts_on = plans_upgrade_fixture.record_date),
  (select original_created_at from plans_upgrade_fixture),
  'upgrade preserves original creation time'
);
select is(
  (select legacy_record_updated_at
   from public.plans, plans_upgrade_fixture
   where plans.owner_id = plans_upgrade_fixture.owner_id
     and plans.horizon = 'day'
     and plans.starts_on = plans_upgrade_fixture.record_date),
  (select original_updated_at from plans_upgrade_fixture),
  'upgrade preserves original update time'
);
select is(
  (select jsonb_array_length(legacy_commitment_issues)
   from public.plans, plans_upgrade_fixture
   where plans.owner_id = plans_upgrade_fixture.owner_id
     and plans.horizon = 'day'
     and plans.starts_on = plans_upgrade_fixture.record_date),
  2,
  'upgrade records both cross-owner and missing task issues'
);
select is(
  (select count(*)
   from public.commitments, plans_upgrade_fixture
   where commitments.owner_id = plans_upgrade_fixture.owner_id
     and commitments.subject_type = 'task'
     and commitments.subject_id = plans_upgrade_fixture.valid_task_id),
  1::bigint,
  'valid morning history becomes one commitment'
);
select is(
  (select count(*)
   from public.commitments, plans_upgrade_fixture
   where commitments.owner_id = plans_upgrade_fixture.owner_id
     and commitments.subject_type = 'task'
     and commitments.subject_id = plans_upgrade_fixture.scheduled_task_id
     and commitments.plan_id = (
       select id from public.plans
       where plans.owner_id = plans_upgrade_fixture.owner_id
         and plans.horizon = 'day'
         and plans.starts_on = plans_upgrade_fixture.scheduled_date
     )),
  1::bigint,
  'scheduled_for history becomes a day commitment'
);
select is(
  (select count(*) from public.day_records, plans_upgrade_fixture
   where day_records.owner_id = plans_upgrade_fixture.owner_id
     and day_records.record_date = plans_upgrade_fixture.record_date),
  1::bigint,
  'the immutable archive keeps every original day row'
);
select is(
  (select count(*) from public.plans, plans_upgrade_fixture
   where plans.owner_id = plans_upgrade_fixture.owner_id and plans.horizon = 'day'),
  2::bigint,
  'both legacy day sources become canonical day plans'
);

select * from finish();
rollback;
