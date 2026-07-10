-- Phase 2 persists the small amount of server state needed to pause and
-- resume a session without trusting a client clock.
alter table public.sessions
  add column if not exists running_since timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists active_milliseconds bigint not null default 0;

update public.sessions
set running_since = started_at
where ended_at is null and running_since is null and paused_at is null;

alter table public.sessions
  add constraint sessions_active_milliseconds_check check (active_milliseconds >= 0),
  add constraint sessions_runtime_state_check check (
    ended_at is not null
    or (paused_at is null and running_since is not null)
    or (paused_at is not null and running_since is null)
  );

alter table public.sessions
  add constraint sessions_distraction_tag_check check (
    distraction_tag is null
    or distraction_tag in ('distraction', 'interruption', 'done-early', 'energy')
  );

create index if not exists sessions_active_owner_idx
  on public.sessions (owner_id, started_at desc)
  where ended_at is null;

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Desk companion' check (length(trim(label)) between 1 and 80),
  token_hash text not null unique check (length(token_hash) = 64),
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index devices_owner_idx on public.devices (owner_id, created_at desc);

alter table public.devices enable row level security;

create policy devices_owner_all on public.devices
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke all on public.devices from anon;
grant select, insert, update, delete on public.devices to authenticated;

-- A token is created lazily for each week. The update predicate and row lock
-- make applying it once safe when two clients submit at the same time.
create or replace function public.apply_forgiveness_token(p_reason text default null)
returns public.forgiveness_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  token public.forgiveness_tokens;
  week date := date_trunc('week', current_date)::date;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  insert into public.forgiveness_tokens (owner_id, week_start)
  values (auth.uid(), week)
  on conflict (owner_id, week_start) do nothing;

  update public.forgiveness_tokens
  set used_at = now(), reason = nullif(trim(coalesce(p_reason, '')), '')
  where owner_id = auth.uid() and week_start = week and used_at is null
  returning * into token;

  if token.id is null then
    raise exception using errcode = '23514', message = 'forgiveness token already used';
  end if;

  return token;
end;
$$;

grant execute on function public.apply_forgiveness_token(text) to authenticated;

-- Session/day/token/device writes go through the authenticated Edge Functions.
-- Select remains available for Realtime and read-only client views.
revoke insert, update, delete on public.sessions, public.day_records,
  public.forgiveness_tokens, public.devices from authenticated;
grant select on public.sessions, public.day_records, public.forgiveness_tokens, public.devices
  to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.sessions, public.tasks, public.day_records;
exception
  when duplicate_object then null;
end;
$$;
