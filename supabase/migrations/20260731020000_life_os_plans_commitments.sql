-- Life-OS planning spine. Plans own calendar identity; commitments are the
-- authoritative placement of subjects into those plans.

begin;

alter table public.profiles
  add column time_zone text not null default 'UTC';

create or replace function public.is_valid_time_zone(p_time_zone text)
returns boolean
language sql
stable
set search_path = public, pg_catalog
as $$
  select p_time_zone is not null
    and exists (
      select 1
      from pg_catalog.pg_timezone_names
      where pg_timezone_names.name = p_time_zone
    );
$$;

create or replace function public.validate_profile_time_zone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.is_valid_time_zone(new.time_zone) then
    raise exception using
      errcode = '23514',
      message = 'profile time_zone must be a recognized IANA time zone';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_time_zone
  before insert or update of time_zone on public.profiles
  for each row execute function public.validate_profile_time_zone();

create or replace function public.owner_local_date(
  p_owner_id uuid,
  p_at timestamptz default now()
)
returns date
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  owner_time_zone text;
begin
  select profiles.time_zone
    into owner_time_zone
  from public.profiles
  where profiles.id = p_owner_id;

  if owner_time_zone is null then
    raise exception using
      errcode = '23503',
      message = 'plan owner does not exist';
  end if;

  return (p_at at time zone owner_time_zone)::date;
end;
$$;

create or replace function public.owner_iso_week_start(
  p_owner_id uuid,
  p_at timestamptz default now()
)
returns date
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select date_trunc(
    'week',
    public.owner_local_date(p_owner_id, p_at)::timestamp
  )::date;
$$;

create or replace function public.plan_starts_on_aligned(
  p_horizon text,
  p_starts_on date
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case p_horizon
    when 'year' then extract(month from p_starts_on) = 1
      and extract(day from p_starts_on) = 1
    when 'quarter' then extract(month from p_starts_on) in (1, 4, 7, 10)
      and extract(day from p_starts_on) = 1
    when 'month' then extract(day from p_starts_on) = 1
    when 'week' then extract(isodow from p_starts_on) = 1
    when 'day' then true
    else false
  end;
$$;

create or replace function public.plan_parent_horizon(p_horizon text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case p_horizon
    when 'quarter' then 'year'
    when 'month' then 'quarter'
    when 'week' then 'month'
    when 'day' then 'week'
    else null
  end;
$$;

create or replace function public.plan_parent_starts_on(
  p_horizon text,
  p_starts_on date
)
returns date
language sql
immutable
set search_path = pg_catalog
as $$
  select case p_horizon
    when 'quarter' then date_trunc('year', p_starts_on::timestamp)::date
    when 'month' then date_trunc('quarter', p_starts_on::timestamp)::date
    when 'week' then date_trunc('month', p_starts_on::timestamp)::date
    when 'day' then date_trunc('week', p_starts_on::timestamp)::date
    else null
  end;
$$;

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  horizon text not null
    check (horizon in ('year', 'quarter', 'month', 'week', 'day')),
  starts_on date not null,
  parent_plan_id uuid,
  -- Exact legacy day-record material. These columns make the upgrade auditable
  -- even when a historical task id is missing or belongs to another owner.
  legacy_morning_task_ids uuid[] not null default '{}',
  legacy_plan_match boolean,
  legacy_went_wrong_tag text,
  legacy_note text,
  legacy_record_created_at timestamptz,
  legacy_record_updated_at timestamptz,
  legacy_commitment_issues jsonb not null default '[]'::jsonb
    check (jsonb_typeof(legacy_commitment_issues) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, horizon, starts_on),
  foreign key (parent_plan_id, owner_id)
    references public.plans (id, owner_id)
    on delete restrict,
  check (public.plan_starts_on_aligned(horizon, starts_on)),
  check ((horizon = 'year') = (parent_plan_id is null))
);

create index plans_owner_parent_idx
  on public.plans (owner_id, parent_plan_id);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

create or replace function public.enforce_plan_structure()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  parent_horizon text;
  parent_starts_on date;
begin
  if tg_op = 'UPDATE'
     and (
       new.owner_id is distinct from old.owner_id
       or new.horizon is distinct from old.horizon
       or new.starts_on is distinct from old.starts_on
       or new.parent_plan_id is distinct from old.parent_plan_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'plan calendar identity and parent are immutable';
  end if;

  if new.horizon = 'year' then
    return new;
  end if;

  select plans.horizon, plans.starts_on
    into parent_horizon, parent_starts_on
  from public.plans
  where plans.id = new.parent_plan_id
    and plans.owner_id = new.owner_id;

  if parent_horizon is null
     or parent_horizon <> public.plan_parent_horizon(new.horizon)
     or parent_starts_on <> public.plan_parent_starts_on(new.horizon, new.starts_on) then
    raise exception using
      errcode = '23514',
      message = 'plan parent must be the same-owner next horizon containing starts_on';
  end if;

  return new;
end;
$$;

create trigger plans_enforce_structure
  before insert or update of owner_id, horizon, starts_on, parent_plan_id
  on public.plans
  for each row execute function public.enforce_plan_structure();

create or replace function public.ensure_owner_plan(
  p_owner_id uuid,
  p_horizon text,
  p_starts_on date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  result_id uuid;
  parent_id uuid;
  expected_parent_horizon text;
  expected_parent_starts_on date;
begin
  if not exists (select 1 from public.profiles where id = p_owner_id) then
    raise exception using errcode = '23503', message = 'plan owner does not exist';
  end if;
  if not public.plan_starts_on_aligned(p_horizon, p_starts_on) then
    raise exception using errcode = '23514', message = 'plan starts_on is not horizon aligned';
  end if;

  expected_parent_horizon := public.plan_parent_horizon(p_horizon);
  expected_parent_starts_on := public.plan_parent_starts_on(p_horizon, p_starts_on);
  if expected_parent_horizon is not null then
    parent_id := public.ensure_owner_plan(
      p_owner_id,
      expected_parent_horizon,
      expected_parent_starts_on
    );
  end if;

  insert into public.plans (owner_id, horizon, starts_on, parent_plan_id)
  values (p_owner_id, p_horizon, p_starts_on, parent_id)
  on conflict (owner_id, horizon, starts_on) do nothing
  returning id into result_id;

  if result_id is null then
    select plans.id into strict result_id
    from public.plans
    where plans.owner_id = p_owner_id
      and plans.horizon = p_horizon
      and plans.starts_on = p_starts_on;
  end if;

  return result_id;
end;
$$;

create table public.commitments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null,
  subject_type text not null
    check (subject_type in ('goal', 'task', 'occurrence')),
  subject_id uuid not null,
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (plan_id, subject_type, subject_id),
  foreign key (plan_id, owner_id)
    references public.plans (id, owner_id)
    on delete cascade
);

create index commitments_owner_subject_idx
  on public.commitments (owner_id, subject_type, subject_id);

-- SECURITY DEFINER so integrity checks see plan/subject rows even when the
-- invoker's RLS would hide them. Access control remains on the commitments
-- RLS policies (WITH CHECK owner_id = auth.uid()).
create or replace function public.enforce_commitment_subject()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  plan_horizon text;
  subject_owner uuid;
begin
  if tg_op = 'UPDATE'
     and (
       new.owner_id is distinct from old.owner_id
       or new.plan_id is distinct from old.plan_id
       or new.subject_type is distinct from old.subject_type
       or new.subject_id is distinct from old.subject_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'commitment ownership, plan, and subject are immutable';
  end if;

  select plans.horizon into plan_horizon
  from public.plans
  where plans.id = new.plan_id
    and plans.owner_id = new.owner_id;

  if plan_horizon is null then
    raise exception using errcode = '23514', message = 'commitment plan must belong to owner';
  end if;

  if new.subject_type = 'goal' then
    select goals.owner_id into subject_owner
    from public.goals
    where goals.id = new.subject_id;
  elsif new.subject_type = 'task' then
    select tasks.owner_id into subject_owner
    from public.tasks
    where tasks.id = new.subject_id;
    if plan_horizon not in ('week', 'day') then
      raise exception using errcode = '23514', message = 'tasks commit only to week or day plans';
    end if;
  else
    if plan_horizon <> 'day' then
      raise exception using errcode = '23514', message = 'occurrences commit only to day plans';
    end if;
    if to_regclass('public.occurrences') is null then
      raise exception using errcode = '23503', message = 'occurrences table does not exist yet';
    end if;
    execute 'select owner_id from public.occurrences where id = $1'
      into subject_owner
      using new.subject_id;
  end if;

  if subject_owner is null or subject_owner <> new.owner_id then
    raise exception using
      errcode = '23514',
      message = 'commitment subject must exist and belong to owner';
  end if;

  return new;
end;
$$;

create trigger commitments_enforce_subject
  before insert or update of owner_id, plan_id, subject_type, subject_id
  on public.commitments
  for each row execute function public.enforce_commitment_subject();

create or replace function public.prevent_committed_subject_owner_change()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  kind text := case tg_table_name when 'goals' then 'goal' else 'task' end;
begin
  if new.owner_id is distinct from old.owner_id
     and exists (
       select 1 from public.commitments
       where commitments.subject_type = kind
         and commitments.subject_id = old.id
     ) then
    raise exception using
      errcode = '23514',
      message = 'committed subject owner is immutable';
  end if;
  return new;
end;
$$;

create trigger goals_prevent_committed_owner_change
  before update of owner_id on public.goals
  for each row execute function public.prevent_committed_subject_owner_change();
create trigger tasks_prevent_committed_owner_change
  before update of owner_id on public.tasks
  for each row execute function public.prevent_committed_subject_owner_change();

create or replace function public.delete_subject_commitments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  kind text := case tg_table_name when 'goals' then 'goal' else 'task' end;
begin
  delete from public.commitments
  where commitments.owner_id = old.owner_id
    and commitments.subject_type = kind
    and commitments.subject_id = old.id;
  return old;
end;
$$;

create trigger goals_delete_commitments
  after delete on public.goals
  for each row execute function public.delete_subject_commitments();
create trigger tasks_delete_commitments
  after delete on public.tasks
  for each row execute function public.delete_subject_commitments();

alter table public.plans enable row level security;
alter table public.commitments enable row level security;

create policy plans_owner_all on public.plans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy commitments_owner_all on public.commitments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke all on public.plans from anon, authenticated;
revoke all on public.commitments from anon, authenticated;
grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, update, delete on public.commitments to authenticated;
grant all on public.plans to service_role;
grant all on public.commitments to service_role;

-- Freeze the legacy source before taking the upgrade snapshot. Without this
-- lock, a concurrent ritual write could commit after the loop has passed its
-- date and before writes are revoked, leaving that row outside Plans forever.
lock table public.day_records in share row exclusive mode;

-- Preserve each legacy day row on its canonical day Plan. Parent Plans are
-- created recursively, and the unique calendar key makes replay/concurrency
-- idempotent.
do $$
declare
  legacy_record public.day_records%rowtype;
  day_plan_id uuid;
  issues jsonb;
begin
  for legacy_record in
    select * from public.day_records order by owner_id, record_date
  loop
    day_plan_id := public.ensure_owner_plan(
      legacy_record.owner_id,
      'day',
      legacy_record.record_date
    );

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'taskId', requested.task_id,
          'reason',
          case when tasks.id is null then 'missing' else 'cross_owner' end
        )
        order by requested.ordinality
      ),
      '[]'::jsonb
    )
      into issues
    from unnest(legacy_record.morning_task_ids) with ordinality
      as requested(task_id, ordinality)
    left join public.tasks on tasks.id = requested.task_id
    where tasks.id is null or tasks.owner_id <> legacy_record.owner_id;

    update public.plans
    set legacy_morning_task_ids = legacy_record.morning_task_ids,
        legacy_plan_match = legacy_record.plan_match,
        legacy_went_wrong_tag = legacy_record.went_wrong_tag,
        legacy_note = legacy_record.note,
        legacy_record_created_at = legacy_record.created_at,
        legacy_record_updated_at = legacy_record.updated_at,
        legacy_commitment_issues = issues
    where id = day_plan_id;

    insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    select legacy_record.owner_id, day_plan_id, 'task', tasks.id
    from unnest(legacy_record.morning_task_ids) with ordinality
      as requested(task_id, ordinality)
    join public.tasks
      on tasks.id = requested.task_id
     and tasks.owner_id = legacy_record.owner_id
    order by requested.ordinality
    on conflict (plan_id, subject_type, subject_id) do nothing;
  end loop;
end;
$$;

-- A scheduled task was the pre-Life-OS day-placement seam. Convert every one,
-- including completed/cancelled history, into an authoritative commitment.
do $$
declare
  scheduled_task record;
  day_plan_id uuid;
begin
  for scheduled_task in
    select id, owner_id, scheduled_for
    from public.tasks
    where scheduled_for is not null
    order by owner_id, scheduled_for, id
  loop
    day_plan_id := public.ensure_owner_plan(
      scheduled_task.owner_id,
      'day',
      scheduled_task.scheduled_for
    );
    insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    values (scheduled_task.owner_id, day_plan_id, 'task', scheduled_task.id)
    on conflict (plan_id, subject_type, subject_id) do nothing;
  end loop;
end;
$$;

-- Legacy task scheduling remains a command seam until the Today UI fully owns
-- placement. It writes the commitment in the same transaction; consumers read
-- commitments, never scheduled_for, as planning truth.
create or replace function public.sync_scheduled_task_commitment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  old_plan_id uuid;
  new_plan_id uuid;
begin
  if tg_op = 'UPDATE'
     and old.scheduled_for is not null
     and old.scheduled_for is distinct from new.scheduled_for then
    select plans.id into old_plan_id
    from public.plans
    where plans.owner_id = old.owner_id
      and plans.horizon = 'day'
      and plans.starts_on = old.scheduled_for;

    if old_plan_id is not null then
      delete from public.commitments
      where owner_id = old.owner_id
        and plan_id = old_plan_id
        and subject_type = 'task'
        and subject_id = old.id;
    end if;
  end if;

  if new.scheduled_for is not null then
    new_plan_id := public.ensure_owner_plan(new.owner_id, 'day', new.scheduled_for);
    insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
    values (new.owner_id, new_plan_id, 'task', new.id)
    on conflict (plan_id, subject_type, subject_id) do nothing;
  end if;

  return null;
end;
$$;

create trigger tasks_insert_scheduled_commitment
  after insert on public.tasks
  for each row
  when (new.scheduled_for is not null)
  execute function public.sync_scheduled_task_commitment();

create trigger tasks_update_scheduled_commitment
  after update of owner_id, scheduled_for on public.tasks
  for each row
  when (new.scheduled_for is distinct from old.scheduled_for)
  execute function public.sync_scheduled_task_commitment();

create or replace function public.commit_today_tasks(
  p_owner_id uuid,
  p_task_ids uuid[],
  p_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  local_today date;
  day_plan_id uuid;
begin
  if p_owner_id is null or coalesce(cardinality(p_task_ids), 0) not between 0 and 3 then
    raise exception using
      errcode = '23514',
      message = 'today commit must contain at most 3 tasks';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_task_ids, '{}'::uuid[])) as requested(task_id)
    group by requested.task_id having count(*) > 1
  ) then
    raise exception using errcode = '23514', message = 'today commit tasks must be unique';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_task_ids, '{}'::uuid[])) as requested(task_id)
    left join public.tasks
      on tasks.id = requested.task_id
     and tasks.owner_id = p_owner_id
    where tasks.id is null or tasks.status not in ('inbox', 'planned')
  ) then
    raise exception using
      errcode = '23514',
      message = 'today commit tasks must belong to you and be open';
  end if;

  local_today := public.owner_local_date(p_owner_id, p_at);
  day_plan_id := public.ensure_owner_plan(p_owner_id, 'day', local_today);

  update public.tasks
  set scheduled_for = local_today
  where owner_id = p_owner_id
    and id = any(coalesce(p_task_ids, '{}'::uuid[]))
    and scheduled_for is null;

  insert into public.commitments (owner_id, plan_id, subject_type, subject_id)
  select p_owner_id, day_plan_id, 'task', requested.task_id
  from unnest(coalesce(p_task_ids, '{}'::uuid[])) as requested(task_id)
  on conflict (plan_id, subject_type, subject_id) do nothing;

  return day_plan_id;
end;
$$;

create or replace function public.ensure_today_plan(
  p_owner_id uuid,
  p_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_owner_id then
    raise exception using errcode = '42501', message = 'cannot ensure another owners plan';
  end if;
  return public.ensure_owner_plan(
    p_owner_id,
    'day',
    public.owner_local_date(p_owner_id, p_at)
  );
end;
$$;

drop function if exists public.commit_morning_plan(uuid, uuid[]);
create function public.commit_morning_plan(p_owner_id uuid, p_task_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  local_today date;
  day_plan_id uuid;
  previous_bypass text := current_setting('ekagra.morning_commit_bypass', true);
begin
  -- Empty commits are allowed (clear Today). Non-empty still 1..3 unique open tasks.
  if p_owner_id is null
     or coalesce(cardinality(p_task_ids), 0) > 3 then
    raise exception using
      errcode = '23514',
      message = 'today commit must contain at most 3 tasks';
  end if;

  local_today := public.owner_local_date(p_owner_id);
  day_plan_id := public.ensure_owner_plan(p_owner_id, 'day', local_today);

  delete from public.commitments
  where owner_id = p_owner_id
    and plan_id = day_plan_id
    and subject_type = 'task'
    and not (subject_id = any(coalesce(p_task_ids, '{}'::uuid[])));

  update public.tasks
  set scheduled_for = null
  where owner_id = p_owner_id
    and scheduled_for = local_today
    and not (id = any(coalesce(p_task_ids, '{}'::uuid[])));

  -- Preserve planned/inbox semantics for clients that still key off status.
  -- "planned" here means committed for today, not necessarily calendar-scheduled.
  begin
    perform set_config('ekagra.morning_commit_bypass', 'on', true);

    update public.tasks
    set status = 'inbox'
    where owner_id = p_owner_id and status = 'planned';

    if coalesce(cardinality(p_task_ids), 0) > 0 then
      update public.tasks
      set status = 'planned'
      where owner_id = p_owner_id and id = any(p_task_ids);
    end if;

    perform set_config(
      'ekagra.morning_commit_bypass',
      coalesce(previous_bypass, ''),
      true
    );
  exception when others then
    perform set_config(
      'ekagra.morning_commit_bypass',
      coalesce(previous_bypass, ''),
      true
    );
    raise;
  end;

  perform public.commit_today_tasks(p_owner_id, p_task_ids);

  update public.plans
  set legacy_morning_task_ids = coalesce(p_task_ids, '{}'::uuid[]),
      legacy_record_updated_at = now()
  where id = day_plan_id;

  return jsonb_build_object('planId', day_plan_id);
end;
$$;

create or replace function public.close_today_plan(
  p_owner_id uuid,
  p_plan_match boolean,
  p_went_wrong_tag text,
  p_note text default null,
  p_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  day_plan_id uuid;
begin
  day_plan_id := public.ensure_owner_plan(
    p_owner_id,
    'day',
    public.owner_local_date(p_owner_id, p_at)
  );
  update public.plans
  set legacy_plan_match = p_plan_match,
      legacy_went_wrong_tag = p_went_wrong_tag,
      legacy_note = p_note,
      legacy_record_updated_at = now()
  where id = day_plan_id;
  return day_plan_id;
end;
$$;

-- The old rows remain an immutable audit archive. All current planning writes
-- above target Plans/Commitments, so there are not two mutable sources.
drop policy if exists day_records_owner_all on public.day_records;
create policy day_records_owner_select on public.day_records
  for select using (owner_id = auth.uid());
revoke insert, update, delete on public.day_records from anon, authenticated, service_role;
grant select on public.day_records to authenticated, service_role;

revoke all on function public.is_valid_time_zone(text) from public;
revoke all on function public.owner_local_date(uuid, timestamptz) from public;
revoke all on function public.owner_iso_week_start(uuid, timestamptz) from public;
revoke all on function public.ensure_owner_plan(uuid, text, date) from public;
revoke all on function public.commit_today_tasks(uuid, uuid[], timestamptz) from public;
revoke all on function public.ensure_today_plan(uuid, timestamptz) from public;
revoke all on function public.commit_morning_plan(uuid, uuid[]) from public;
revoke all on function public.close_today_plan(uuid, boolean, text, text, timestamptz) from public;
grant execute on function public.owner_local_date(uuid, timestamptz) to service_role;
grant execute on function public.owner_iso_week_start(uuid, timestamptz) to service_role;
grant execute on function public.ensure_owner_plan(uuid, text, date) to service_role;
grant execute on function public.commit_today_tasks(uuid, uuid[], timestamptz) to service_role;
grant execute on function public.ensure_today_plan(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.commit_morning_plan(uuid, uuid[]) to service_role;
grant execute on function public.close_today_plan(uuid, boolean, text, text, timestamptz) to service_role;

commit;
