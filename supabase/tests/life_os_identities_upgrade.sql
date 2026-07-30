begin;

-- Reconstruct the schema immediately before the identities migration, seed a
-- legacy row, and replay the real migration inside this rollback-only test.
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

\ir ../migrations/20260731010000_life_os_identities.sql

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
select * from finish();
rollback;
