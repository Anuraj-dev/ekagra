begin;

select plan(37);

select has_table('public', 'identities', 'identities table exists');
select has_column('public', 'identities', 'owner_id', 'identities are owner scoped');
select has_column('public', 'identities', 'name', 'identities have names');
select has_column('public', 'identities', 'is_default', 'identities expose the default marker');
select has_column('public', 'goals', 'identity_id', 'goals reference identities');
select col_not_null('public', 'goals', 'identity_id', 'every goal has an identity');

select ok(
  (select relrowsecurity
   from pg_class
   join pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where pg_namespace.nspname = 'public' and pg_class.relname = 'identities'),
  'identities have RLS enabled'
);
select is(
  (select count(*) from public.profiles
   where not exists (
     select 1 from public.identities
     where identities.owner_id = profiles.id
       and identities.name = 'Me'
       and identities.is_default
   )),
  0::bigint,
  'every existing owner has a default Me identity'
);
select is(
  (select count(*) from public.profiles
   where 1 <> (
     select count(*) from public.identities
     where identities.owner_id = profiles.id and identities.is_default
   )),
  0::bigint,
  'every existing owner has exactly one default identity'
);
select is(
  (select count(*) from public.goals
   join public.identities
     on identities.id = goals.identity_id
    and identities.owner_id = goals.owner_id
    and identities.name = goals.identity_role),
  (select count(*) from public.goals),
  'every migrated goal preserves its role through a same-owner identity'
);
select is(
  (select identities.name
   from public.goals
   join public.identities on identities.id = goals.identity_id
   where goals.id = '10000000-0000-0000-0000-000000000001'::uuid),
  'Builder',
  'the seeded Builder role is preserved as an identity'
);
select is(
  (select convalidated
   from pg_constraint
   where conrelid = 'public.identities'::regclass
     and conname = 'identities_name_canonical'),
  false,
  'the canonical name check stays NOT VALID so historical identities survive'
);
select is(
  has_table_privilege('anon', 'public.identities', 'select'),
  false,
  'anonymous users cannot select identities'
);
select is(
  has_table_privilege('authenticated', 'public.identities', 'delete'),
  false,
  'authenticated users cannot delete identities'
);

insert into public.identities (id, owner_id, name)
values (
  '71000000-0000-0000-0000-000000000004'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Student'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*) from public.identities
   where owner_id = '00000000-0000-0000-0000-000000000002'::uuid),
  0::bigint,
  'an owner cannot read another owners identities'
);
select lives_ok(
  $$insert into public.identities (id, owner_id, name)
    values ('71000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Student')$$,
  'an owner can create an identity'
);
select throws_ok(
  $$insert into public.identities (id, owner_id, name)
    values ('71000000-0000-0000-0000-000000000002'::uuid,
            '00000000-0000-0000-0000-000000000002'::uuid,
            'Intruder')$$,
  '42501',
  null,
  'an owner cannot create an identity for another owner'
);
select throws_ok(
  $$insert into public.identities (id, owner_id, name)
    values ('71000000-0000-0000-0000-000000000003'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Student')$$,
  '23505',
  null,
  'identity names are unique per owner'
);
select throws_ok(
  $$insert into public.identities (id, owner_id, name)
    values ('71000000-0000-0000-0000-000000000005'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            E'\tStudent\t')$$,
  '23514',
  null,
  'a direct write cannot smuggle a surrounding-whitespace duplicate name'
);
select throws_ok(
  format(
    $$insert into public.identities (id, owner_id, name)
      values ('71000000-0000-0000-0000-000000000006'::uuid,
              '00000000-0000-0000-0000-000000000001'::uuid,
              %L)$$,
    repeat('n', 121)
  ),
  '23514',
  null,
  'a direct write cannot exceed the 120 character name bound'
);
select lives_ok(
  format(
    $$insert into public.identities (id, owner_id, name)
      values ('71000000-0000-0000-0000-000000000007'::uuid,
              '00000000-0000-0000-0000-000000000001'::uuid,
              %L)$$,
    repeat('n', 120)
  ),
  'a 120 character identity name is still accepted'
);
select throws_ok(
  $$update public.identities
    set name = ' Student '
    where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
      and name = 'Student'$$,
  '23514',
  null,
  'a direct update cannot introduce a padded name'
);
select lives_ok(
  $$insert into public.goals (id, owner_id, title, identity_role)
    values ('72000000-0000-0000-0000-000000000005'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Padded legacy role goal',
            '  Student  ')$$,
  'a padded legacy goal role still resolves'
);
select is(
  (select count(*) from public.identities
   where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
     and name = 'Student'),
  1::bigint,
  'a padded legacy goal role reuses the canonical identity instead of duplicating it'
);
select lives_ok(
  $$insert into public.goals (id, owner_id, title, identity_role)
    values ('72000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Legacy writer goal',
            'Runner')$$,
  'a legacy goal write still succeeds'
);
select is(
  (select identities.name
   from public.goals
   join public.identities on identities.id = goals.identity_id
   where goals.id = '72000000-0000-0000-0000-000000000001'::uuid),
  'Runner',
  'a legacy goal write creates and links its identity'
);
select lives_ok(
  $$insert into public.goals (id, owner_id, title, identity_id)
    values ('72000000-0000-0000-0000-000000000002'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Identity writer goal',
            '71000000-0000-0000-0000-000000000001'::uuid)$$,
  'an identity-id goal write succeeds without a legacy role'
);
select is(
  (select identity_role from public.goals
   where id = '72000000-0000-0000-0000-000000000002'::uuid),
  'Student',
  'identity-id writes populate the compatibility mirror'
);
select lives_ok(
  $$insert into public.goals (id, owner_id, title)
    values ('72000000-0000-0000-0000-000000000003'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Default identity goal')$$,
  'a goal can use the one-tap default identity'
);
select is(
  (select identity_role from public.goals
   where id = '72000000-0000-0000-0000-000000000003'::uuid),
  'Me',
  'omitting identity uses Me'
);
select lives_ok(
  $$update public.goals
    set identity_role = 'Learner'
    where id = '72000000-0000-0000-0000-000000000002'::uuid$$,
  'a legacy role update remains compatible'
);
select is(
  (select identities.name
   from public.goals
   join public.identities on identities.id = goals.identity_id
   where goals.id = '72000000-0000-0000-0000-000000000002'::uuid),
  'Learner',
  'a legacy role update changes the authoritative identity link'
);
select throws_ok(
  $$update public.goals
    set identity_id = '71000000-0000-0000-0000-000000000004'::uuid
    where id = '72000000-0000-0000-0000-000000000002'::uuid$$,
  '23514',
  'goal identity must belong to goal owner',
  'an owner cannot link a goal to another owners identity'
);
select throws_ok(
  $$update public.identities
    set name = 'Renamed Student'
    where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
      and name = 'Student'$$,
  '23514',
  'identity name is immutable',
  'identity names are immutable so no identity-to-goal lock path exists'
);
select is(
  (select count(*) from public.identities
   where owner_id = '00000000-0000-0000-0000-000000000001'::uuid
     and name = 'Student'),
  1::bigint,
  'the owner keeps one Student identity'
);

reset role;

select is(
  (select count(*) from public.identities where name = 'Student'),
  2::bigint,
  'the same identity name is valid for two owners'
);
select throws_ok(
  $$insert into public.goals (id, owner_id, title, identity_id)
    values ('72000000-0000-0000-0000-000000000004'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Cross-owner identity goal',
            '71000000-0000-0000-0000-000000000004'::uuid)$$,
  '23514',
  'goal identity must belong to goal owner',
  'the database rejects a cross-owner identity link'
);

select * from finish();
rollback;
