-- Add v2 planning fields and client-operation identifiers for idempotent
-- task, goal, and session creation. Existing rows remain valid via nulls.

alter table public.tasks
  add column if not exists priority text check (priority in ('p1', 'p2', 'p3')),
  add column if not exists scheduled_for date,
  add column if not exists scheduled_time time,
  add column if not exists deadline date,
  add column if not exists notes text,
  add column if not exists client_op_id uuid;

alter table public.goals
  add column if not exists priority text check (priority in ('p1', 'p2', 'p3')),
  add column if not exists client_op_id uuid;

alter table public.sessions
  add column if not exists client_op_id uuid;

create unique index if not exists tasks_owner_client_op_id_idx
  on public.tasks (owner_id, client_op_id)
  where client_op_id is not null;

create unique index if not exists goals_owner_client_op_id_idx
  on public.goals (owner_id, client_op_id)
  where client_op_id is not null;

create unique index if not exists sessions_owner_client_op_id_idx
  on public.sessions (owner_id, client_op_id)
  where client_op_id is not null;

create index if not exists tasks_owner_scheduled_for_idx
  on public.tasks (owner_id, scheduled_for);

-- Scheduling is the server-authoritative source of planning status. Keep done tasks
-- immutable under schedule-only edits, and respect a status explicitly changed in
-- the same PATCH.
create or replace function public.sync_task_status_with_schedule()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'inbox' and new.scheduled_for is not null then
      new.status = 'planned';
    end if;
  elsif new.scheduled_for is distinct from old.scheduled_for
        and new.status is not distinct from old.status
        and old.status <> 'done' then
    new.status = case when new.scheduled_for is null then 'inbox' else 'planned' end;
  end if;
  return new;
end;
$$;

create trigger tasks_sync_status_with_schedule
  before insert or update of scheduled_for on public.tasks
  for each row execute function public.sync_task_status_with_schedule();

-- Defense in depth: the edge-fn parser bounds notes at 2000 chars, but a client using the
-- table API directly bypasses it. Enforce the limit at the DB boundary too (idempotent).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_notes_len') then
    alter table public.tasks
      add constraint tasks_notes_len check (notes is null or char_length(notes) <= 2000);
  end if;
end $$;
