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

-- Defense in depth: the edge-fn parser bounds notes at 2000 chars, but a client using the
-- table API directly bypasses it. Enforce the limit at the DB boundary too (idempotent).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_notes_len') then
    alter table public.tasks
      add constraint tasks_notes_len check (notes is null or char_length(notes) <= 2000);
  end if;
end $$;
