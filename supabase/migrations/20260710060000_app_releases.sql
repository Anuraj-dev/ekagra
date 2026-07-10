-- Direct APK update pipeline.
-- A published release is announced to running phones via this table; the APK
-- binary itself is served from the public `app-releases` storage bucket because
-- the GitHub repo is private and its release assets are not reachable from a
-- device. Only the release CI (service_role) writes rows and objects; any
-- authenticated client may read the latest release to prompt an in-app update.
create table public.app_releases (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'android',
  version text not null,
  apk_url text not null,
  sha256 text,
  notes text,
  created_at timestamptz not null default now(),
  unique (platform, version)
);

create index app_releases_platform_created_idx
  on public.app_releases (platform, created_at desc);

alter table public.app_releases enable row level security;

-- Any signed-in client may read releases to check for updates. Writes are not
-- exposed through RLS at all; they happen only via the service_role client in
-- the release workflow, which bypasses RLS.
create policy app_releases_authenticated_select on public.app_releases
  for select to authenticated using (true);

-- A fresh database created from these migrations does not carry the default
-- service_role grants for a newly created table, so state them explicitly
-- (matching 20260710030000_service_role_grants.sql).
grant usage on schema public to service_role;
grant all on public.app_releases to service_role;

-- Public bucket that serves the APK binaries. Idempotent so a re-run of the
-- migration set does not error on an existing bucket.
insert into storage.buckets (id, name, public)
values ('app-releases', 'app-releases', true)
on conflict (id) do update set public = true;
