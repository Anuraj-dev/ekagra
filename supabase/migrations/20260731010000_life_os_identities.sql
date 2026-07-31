-- Promote the legacy goals.identity_role label to an owner-scoped Identity.
-- identity_role remains as a trigger-maintained compatibility mirror while
-- existing mobile, CLI, Edge Function, and analytics consumers migrate.

begin;

create table public.identities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  is_default boolean generated always as (name = 'Me') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, name)
);

create index identities_owner_created_idx
  on public.identities (owner_id, created_at, id);

alter table public.identities enable row level security;

create policy identities_owner_select on public.identities
  for select using (owner_id = auth.uid());
create policy identities_owner_insert on public.identities
  for insert with check (owner_id = auth.uid());
create policy identities_owner_update on public.identities
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke all on public.identities from anon;
revoke all on public.identities from authenticated;
grant select, insert, update on public.identities to authenticated;
grant all on public.identities to service_role;

create trigger identities_set_updated_at
  before update on public.identities
  for each row execute function public.set_updated_at();

create or replace function public.guard_identity_key()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception using
      errcode = '23514',
      message = 'identity owner is immutable';
  end if;

  -- P1 changes a Goal's identity link instead of renaming an Identity. Keeping
  -- names immutable avoids a bidirectional Identity -> Goal mirror: that path
  -- would lock identities then goals while legacy Goal resolution locks them in
  -- the opposite order.
  if new.name is distinct from old.name then
    raise exception using
      errcode = '23514',
      message = 'identity name is immutable';
  end if;

  return new;
end;
$$;

create trigger identities_guard_key
  before update of owner_id, name on public.identities
  for each row execute function public.guard_identity_key();

create or replace function public.seed_default_identity_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.identities (owner_id, name)
  values (new.id, 'Me')
  on conflict (owner_id, name) do nothing;
  return new;
end;
$$;

create trigger profiles_seed_default_identity
  after insert on public.profiles
  for each row execute function public.seed_default_identity_for_profile();

-- Install the profile trigger before the existing-owner backfill so a profile
-- committed concurrently with this migration cannot miss its default Identity.
insert into public.identities (owner_id, name)
select profiles.id, 'Me'
from public.profiles
on conflict (owner_id, name) do nothing;

-- Take the strongest lock this transaction will need before snapshotting
-- legacy roles: ADD COLUMN below requires ACCESS EXCLUSIVE. Acquiring it up
-- front avoids a lock-upgrade deadlock with a transaction that first reads
-- goals and then tries to write them.
lock table public.goals in access exclusive mode;

-- Preserve every exact legacy role per owner before adding the goal FK. Public
-- goal writes stay capped at 120 characters, while the Identity read contract
-- deliberately accepts any valid historical text already stored in Postgres.
insert into public.identities (owner_id, name)
select distinct goals.owner_id, goals.identity_role
from public.goals
on conflict (owner_id, name) do nothing;

-- Canonical names for every Identity written from here on. An authenticated
-- client reaching PostgREST directly must not be able to slip a
-- whitespace-padded duplicate past the (owner_id, name) unique key, or store an
-- unbounded name the 120-character goal contract rejects. NOT VALID is the
-- additive-safe half: it skips the full-table scan so every legacy row
-- backfilled above survives byte for byte -- including dirty historical goal
-- labels -- while Postgres still enforces the check on every later INSERT and
-- UPDATE, including updates to those legacy rows.
alter table public.identities
  add constraint identities_name_canonical
    check (
      name = regexp_replace(name, '^[[:space:]]+|[[:space:]]+$', '', 'g')
      and length(name) <= 120
    )
    not valid;

alter table public.goals
  add column identity_id uuid;

-- This is a structural backfill, not a user edit. Suppress only the timestamp
-- trigger so historical goal modification times remain intact.
alter table public.goals disable trigger goals_set_updated_at;

update public.goals
set identity_id = identities.id
from public.identities
where identities.owner_id = goals.owner_id
  and identities.name = goals.identity_role;

alter table public.goals enable trigger goals_set_updated_at;

alter table public.goals
  alter column identity_id set not null,
  add constraint goals_identity_owner_fk
    foreign key (identity_id, owner_id)
    references public.identities (id, owner_id)
    on delete restrict;

create index goals_identity_idx
  on public.goals (owner_id, identity_id, created_at desc);

create or replace function public.resolve_goal_identity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  resolved_id uuid;
  resolved_name text;
  target_name text;
begin
  -- A legacy PATCH changes the mirror while leaving identity_id untouched.
  -- Resolve that label as a new authoritative Identity for the same owner.
  if tg_op = 'UPDATE'
     and new.identity_id is not distinct from old.identity_id
     and new.identity_role is distinct from old.identity_role then
    new.identity_id := null;
  end if;

  if new.identity_id is not null then
    select identities.id, identities.name
      into resolved_id, resolved_name
    from public.identities
    where identities.id = new.identity_id
      and identities.owner_id = new.owner_id;

    if resolved_id is null then
      raise exception using
        errcode = '23514',
        message = 'goal identity must belong to goal owner';
    end if;
  elsif nullif(
    regexp_replace(new.identity_role, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    ''
  ) is not null then
    target_name := regexp_replace(
      new.identity_role,
      '^[[:space:]]+|[[:space:]]+$',
      '',
      'g'
    );

    -- Read first so resolving an existing Identity never takes an unnecessary
    -- row-update lock. INSERT ... DO NOTHING locks only a row it creates; the
    -- loop closes the concurrent-create race when another transaction wins the
    -- same owner/name key first.
    loop
      select identities.id, identities.name
        into resolved_id, resolved_name
      from public.identities
      where identities.owner_id = new.owner_id
        and identities.name = target_name;

      exit when resolved_id is not null;

      insert into public.identities (owner_id, name)
      values (new.owner_id, target_name)
      on conflict (owner_id, name) do nothing
      returning id, name into resolved_id, resolved_name;

      exit when resolved_id is not null;
    end loop;
  else
    select identities.id, identities.name
      into resolved_id, resolved_name
    from public.identities
    where identities.owner_id = new.owner_id
      and identities.is_default;

    if resolved_id is null then
      raise exception using
        errcode = '23514',
        message = 'goal owner must have a default identity';
    end if;
  end if;

  new.identity_id := resolved_id;
  new.identity_role := resolved_name;
  return new;
end;
$$;

create trigger goals_resolve_identity
  before insert or update of owner_id, identity_id, identity_role on public.goals
  for each row execute function public.resolve_goal_identity();

commit;
