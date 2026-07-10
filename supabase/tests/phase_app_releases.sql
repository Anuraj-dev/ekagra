begin;

select plan(10);

-- Schema shape.
select has_table('public', 'app_releases', 'app_releases table exists');
select has_column('public', 'app_releases', 'id', 'app_releases has id');
select has_column('public', 'app_releases', 'platform', 'app_releases has platform');
select has_column('public', 'app_releases', 'version', 'app_releases has version');
select has_column('public', 'app_releases', 'apk_url', 'app_releases has apk_url');
select has_column('public', 'app_releases', 'sha256', 'app_releases has sha256 for download integrity');
select col_is_unique('public', 'app_releases', array['platform', 'version'],
  'a platform/version pair is unique');

-- Seed one release as superuser before switching roles; authenticated cannot
-- write to this table, so the fixture must exist before the role switch.
insert into public.app_releases (platform, version, apk_url, notes)
values ('android', '0.0.1', 'https://example.supabase.co/storage/v1/object/public/app-releases/android/ekagra-v0.0.1.apk', 'seed')
on conflict (platform, version) do nothing;

-- authenticated can read releases.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.app_releases where platform = 'android' and version = '0.0.1'),
  1::bigint,
  'authenticated can select releases'
);

-- authenticated cannot insert releases (no write policy).
select throws_ok(
  $$insert into public.app_releases (platform, version, apk_url)
    values ('android', '9.9.9', 'https://example.test/x.apk')$$,
  '42501',
  null,
  'authenticated cannot insert releases'
);
reset role;

-- anon cannot read releases (select policy is scoped to authenticated).
set local role anon;
select is(
  (select count(*) from public.app_releases),
  0::bigint,
  'anon cannot select releases'
);
reset role;

select * from finish();
rollback;
