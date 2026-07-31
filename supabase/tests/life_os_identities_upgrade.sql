begin;

-- Reconstruct the schema immediately before the identities migration, seed a
-- legacy row, and replay the real migration with its production transaction
-- boundary. Preserve the changed seed values so later pgTAP files see the same
-- fixture state.
create temporary table identity_upgrade_original_goal on commit preserve rows as
select id, identity_role, updated_at
from public.goals
where id = '10000000-0000-0000-0000-000000000001'::uuid;

drop trigger profiles_seed_default_identity on public.profiles;
drop trigger goals_resolve_identity on public.goals;
drop trigger identities_sync_goal_mirror on public.identities;
drop trigger identities_guard_key on public.identities;
alter table public.goals drop constraint goals_identity_owner_fk;
alter table public.goals drop column identity_id;
drop function public.seed_default_identity_for_profile();
drop function public.resolve_goal_identity();
drop function public.sync_identity_name_to_goals();
drop function public.guard_identity_key();
drop table public.identities;

alter table public.goals disable trigger goals_set_updated_at;
update public.goals
set identity_role = ' Legacy Builder ',
    updated_at = '2024-01-02 03:04:05+00'::timestamptz
where id = '10000000-0000-0000-0000-000000000001'::uuid;
alter table public.goals enable trigger goals_set_updated_at;

commit;

\ir ../migrations/20260731010000_life_os_identities.sql

begin;

select plan(4);

select is(
  (select identity_role from public.goals
   where id = '10000000-0000-0000-0000-000000000001'::uuid),
  ' Legacy Builder ',
  'the upgrade preserves the exact legacy role mirror'
);
select is(
  (select identities.name
   from public.goals
   join public.identities on identities.id = goals.identity_id
   where goals.id = '10000000-0000-0000-0000-000000000001'::uuid),
  ' Legacy Builder ',
  'the upgrade promotes the exact legacy role to an identity'
);
select is(
  (select updated_at from public.goals
   where id = '10000000-0000-0000-0000-000000000001'::uuid),
  '2024-01-02 03:04:05+00'::timestamptz,
  'the structural backfill preserves goal modification history'
);
select is(
  (select count(*) from public.goals
   join public.identities
     on identities.id = goals.identity_id
    and identities.owner_id = goals.owner_id),
  (select count(*) from public.goals),
  'the replay links every existing goal to a same-owner identity'
);

update public.identities
set name = original.identity_role
from identity_upgrade_original_goal as original
join public.goals on goals.id = original.id
where identities.id = goals.identity_id;

alter table public.goals disable trigger goals_set_updated_at;
update public.goals
set updated_at = original.updated_at
from identity_upgrade_original_goal as original
where goals.id = original.id;
alter table public.goals enable trigger goals_set_updated_at;

select * from finish();
commit;
