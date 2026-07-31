begin;

-- Snapshot every shared fixture row before reconstructing the schema immediately
-- before the identities migration. The replay has a real COMMIT, so the complete
-- snapshots survive it and let this test restore the database exactly.
create temporary table identity_upgrade_original_profiles
on commit preserve rows as
select * from public.profiles;

create temporary table identity_upgrade_original_identities
on commit preserve rows as
select * from public.identities;

create temporary table identity_upgrade_original_goals
on commit preserve rows as
select * from public.goals;

-- Use a fresh owner and goal so the legacy role cannot collide with any
-- same-owner Identity already present in the shared fixtures.
create temporary table identity_upgrade_fixture (
  owner_id uuid not null,
  goal_id uuid not null,
  legacy_role text not null,
  legacy_updated_at timestamptz not null
) on commit preserve rows;

insert into identity_upgrade_fixture
values (
  gen_random_uuid(),
  gen_random_uuid(),
  ' Legacy Builder ',
  '2024-01-02 03:04:05+00'::timestamptz
);

drop trigger profiles_seed_default_identity on public.profiles;
drop trigger goals_resolve_identity on public.goals;
drop trigger identities_guard_key on public.identities;
alter table public.goals drop constraint goals_identity_owner_fk;
alter table public.goals drop column identity_id;
drop function public.seed_default_identity_for_profile();
drop function public.resolve_goal_identity();
drop function public.guard_identity_key();
drop table public.identities;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  fixture.owner_id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'identity-upgrade-' || replace(fixture.owner_id::text, '-', '') || '@example.test',
  'identity-upgrade-test',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
from identity_upgrade_fixture as fixture;

insert into public.goals (
  id, owner_id, title, identity_role, updated_at
)
select
  fixture.goal_id,
  fixture.owner_id,
  'Legacy identity upgrade fixture',
  fixture.legacy_role,
  fixture.legacy_updated_at
from identity_upgrade_fixture as fixture;

commit;

\ir life_os_identities_migration.inc

begin;

-- Capture the replay result before cleanup. Assertions run only after the full
-- fixture restoration commits, so a pgTAP failure cannot strand shared data in
-- the downgraded or replay-generated state.
create temporary table identity_upgrade_observed
on commit preserve rows as
select
  (select identity_role
   from public.goals
   where id = fixture.goal_id) as legacy_role,
  (select identities.name
   from public.goals
   join public.identities
     on identities.id = goals.identity_id
    and identities.owner_id = goals.owner_id
   where goals.id = fixture.goal_id) as identity_name,
  (select updated_at
   from public.goals
   where id = fixture.goal_id) as goal_updated_at,
  (select count(*)
   from public.goals
   join public.identities
     on identities.id = goals.identity_id
    and identities.owner_id = goals.owner_id) as linked_goal_count,
  (select count(*) from public.goals) as goal_count
from identity_upgrade_fixture as fixture;

-- Remove only the additive fixture, then atomically restore every original
-- Identity UUID and goal link. Dropping the FK briefly avoids name collisions
-- with the replay-generated rows; it is recreated before this transaction
-- commits, so the owner-scoped relationship is always validated at the boundary.
delete from public.goals
using identity_upgrade_fixture as fixture
where goals.id = fixture.goal_id;

delete from auth.users as users
using identity_upgrade_fixture as fixture
where users.id = fixture.owner_id;

alter table public.goals drop constraint goals_identity_owner_fk;
alter table public.goals disable trigger goals_resolve_identity;
alter table public.goals disable trigger goals_set_updated_at;

delete from public.identities
where owner_id in (
  select id from identity_upgrade_original_profiles
);

insert into public.identities (
  id, owner_id, name, created_at, updated_at
)
select id, owner_id, name, created_at, updated_at
from identity_upgrade_original_identities;

update public.goals
set identity_id = original.identity_id,
    identity_role = original.identity_role,
    updated_at = original.updated_at
from identity_upgrade_original_goals as original
where goals.id = original.id;

alter table public.goals enable trigger goals_set_updated_at;
alter table public.goals enable trigger goals_resolve_identity;

alter table public.goals
  add constraint goals_identity_owner_fk
    foreign key (identity_id, owner_id)
    references public.identities (id, owner_id)
    on delete restrict;

commit;

-- Roll back the pgTAP plan itself so this file cannot leak assertion state into
-- another test when the runner reuses a database session.
begin;

select plan(7);

select is(
  (select legacy_role from identity_upgrade_observed),
  (select legacy_role from identity_upgrade_fixture),
  'the upgrade preserves the exact legacy role mirror'
);

select is(
  (select identity_name from identity_upgrade_observed),
  (select legacy_role from identity_upgrade_fixture),
  'the upgrade promotes the exact legacy role to an identity'
);

select is(
  (select goal_updated_at from identity_upgrade_observed),
  (select legacy_updated_at from identity_upgrade_fixture),
  'the structural backfill preserves goal modification history'
);

select is(
  (select linked_goal_count from identity_upgrade_observed),
  (select goal_count from identity_upgrade_observed),
  'the replay links every existing goal to a same-owner identity'
);

select ok(
  not exists (
    (select to_jsonb(current_profile)
     from public.profiles as current_profile
     except
     select to_jsonb(original_profile)
     from identity_upgrade_original_profiles as original_profile)
    union all
    (select to_jsonb(original_profile)
     from identity_upgrade_original_profiles as original_profile
     except
     select to_jsonb(current_profile)
     from public.profiles as current_profile)
  ),
  'the replay test restores every preexisting profile'
);

select ok(
  not exists (
    (select to_jsonb(current_identity)
     from public.identities as current_identity
     except
     select to_jsonb(original_identity)
     from identity_upgrade_original_identities as original_identity)
    union all
    (select to_jsonb(original_identity)
     from identity_upgrade_original_identities as original_identity
     except
     select to_jsonb(current_identity)
     from public.identities as current_identity)
  ),
  'the replay test restores every preexisting identity, including unused identities'
);

select ok(
  not exists (
    (select to_jsonb(current_goal)
     from public.goals as current_goal
     except
     select to_jsonb(original_goal)
     from identity_upgrade_original_goals as original_goal)
    union all
    (select to_jsonb(original_goal)
     from identity_upgrade_original_goals as original_goal
     except
     select to_jsonb(current_goal)
     from public.goals as current_goal)
  ),
  'the replay test restores every preexisting goal and identity link'
);

select * from finish();
rollback;
