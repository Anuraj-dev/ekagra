begin;

-- CI resets this disposable database to the migration immediately before the
-- Identity spine. The fixture therefore exercises a real legacy upgrade without
-- dismantling the latest schema or depending on objects added by later tickets.
create temporary table identity_upgrade_fixture (
  owner_id uuid not null,
  padded_goal_id uuid not null,
  tab_goal_id uuid not null,
  long_goal_id uuid not null,
  long_role text not null,
  legacy_updated_at timestamptz not null
) on commit preserve rows;

insert into identity_upgrade_fixture
values (
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  (select string_agg(md5(value::text), '') from generate_series(1, 100) as series(value)),
  '2024-01-02 03:04:05+00'::timestamptz
);

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

insert into public.goals (id, owner_id, title, identity_role, updated_at)
select padded_goal_id, owner_id, 'Legacy padded identity', ' Legacy Builder ', legacy_updated_at
from identity_upgrade_fixture
union all
select tab_goal_id, owner_id, 'Legacy tab identity', E'\t', legacy_updated_at
from identity_upgrade_fixture
union all
select long_goal_id, owner_id, 'Legacy long identity', long_role, legacy_updated_at
from identity_upgrade_fixture;

commit;

\ir life_os_identities_migration.inc

begin;

select plan(7);

select is(
  (select goals.identity_role
   from public.goals as goals, identity_upgrade_fixture as fixture
   where goals.id = fixture.padded_goal_id),
  ' Legacy Builder ',
  'the upgrade preserves the exact padded legacy role mirror'
);

select is(
  (select identities.name
   from public.goals as goals
   join public.identities as identities
     on identities.id = goals.identity_id
    and identities.owner_id = goals.owner_id,
     identity_upgrade_fixture as fixture
   where goals.id = fixture.padded_goal_id),
  ' Legacy Builder ',
  'the upgrade promotes the exact padded legacy role to an identity'
);

select is(
  (select identities.name
   from public.goals as goals
   join public.identities as identities
     on identities.id = goals.identity_id
    and identities.owner_id = goals.owner_id,
     identity_upgrade_fixture as fixture
   where goals.id = fixture.tab_goal_id),
  E'\t',
  'the upgrade preserves a tab-only role accepted by the legacy constraint'
);

select is(
  (select identities.name
   from public.goals as goals
   join public.identities as identities
     on identities.id = goals.identity_id
    and identities.owner_id = goals.owner_id,
     identity_upgrade_fixture as fixture
   where goals.id = fixture.long_goal_id),
  (select long_role from identity_upgrade_fixture),
  'the upgrade preserves an incompressible legacy role larger than a B-tree index row'
);

select is(
  (select goals.updated_at
   from public.goals as goals, identity_upgrade_fixture as fixture
   where goals.id = fixture.padded_goal_id),
  (select legacy_updated_at from identity_upgrade_fixture),
  'the structural backfill preserves goal modification history'
);

select is(
  (select count(*)
   from public.goals
   join public.identities
     on identities.id = goals.identity_id
    and identities.owner_id = goals.owner_id),
  (select count(*) from public.goals),
  'the replay links every existing goal to a same-owner identity'
);

select is(
  (select count(*)
   from public.identities as identities, identity_upgrade_fixture as fixture
   where identities.owner_id = fixture.owner_id
     and identities.name = 'Me'
     and identities.is_default),
  1::bigint,
  'the replay seeds one default Me identity for the legacy owner'
);

select * from finish();
rollback;
