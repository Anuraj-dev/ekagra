create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Focus user',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_participants_idx
  on public.friendships (requester_id, addressee_id, status);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  identity_role text not null check (length(trim(identity_role)) > 0),
  deadline date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_owner_idx on public.goals (owner_id, created_at desc);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  status text not null default 'inbox'
    check (status in ('inbox', 'planned', 'done', 'cancelled')),
  goal_id uuid references public.goals (id) on delete set null,
  estimated_blocks smallint check (estimated_blocks is null or estimated_blocks > 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index tasks_owner_status_idx on public.tasks (owner_id, status, created_at desc);
create index tasks_goal_idx on public.tasks (goal_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  task_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_minutes smallint not null default 25 check (planned_minutes > 0 and planned_minutes <= 480),
  outcome text check (outcome is null or outcome in ('completed', 'abandoned')),
  distraction_tag text,
  honest_minutes integer not null default 0 check (honest_minutes >= 0),
  earned_block boolean generated always as (coalesce(outcome = 'completed', false)) stored,
  created_at timestamptz not null default now(),
  foreign key (task_id, owner_id) references public.tasks (id, owner_id) on delete restrict,
  check (ended_at is null or ended_at >= started_at),
  check ((ended_at is null and outcome is null) or (ended_at is not null and outcome is not null)),
  check (outcome is null or distraction_tag is not null or outcome = 'completed')
);

create unique index one_active_session_per_owner
  on public.sessions (owner_id)
  where ended_at is null;
create index sessions_owner_started_idx on public.sessions (owner_id, started_at desc);
create index sessions_task_started_idx on public.sessions (task_id, started_at desc);

create table public.day_records (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  record_date date not null default current_date,
  morning_task_ids uuid[] not null default '{}',
  plan_match boolean,
  went_wrong_tag text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, record_date)
);

create index day_records_date_idx on public.day_records (record_date, owner_id);

create table public.forgiveness_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  used_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  unique (owner_id, week_start)
);

create index forgiveness_tokens_owner_week_idx on public.forgiveness_tokens (owner_id, week_start desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger goals_set_updated_at before update on public.goals
for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();
create trigger friendships_set_updated_at before update on public.friendships
for each row execute function public.set_updated_at();
create trigger day_records_set_updated_at before update on public.day_records
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.sessions enable row level security;
alter table public.day_records enable row level security;
alter table public.forgiveness_tokens enable row level security;

create policy profiles_owner_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_owner_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy friendships_participant_select on public.friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy friendships_requester_insert on public.friendships
  for insert with check (requester_id = auth.uid());
create policy friendships_participant_update on public.friendships
  for update using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());
create policy friendships_participant_delete on public.friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy goals_owner_all on public.goals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy tasks_owner_all on public.tasks
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy sessions_owner_all on public.sessions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy day_records_owner_all on public.day_records
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy forgiveness_tokens_owner_all on public.forgiveness_tokens
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create view public.rolling_rates as
with windows(window_days) as (values (7), (30)),
owned_windows as (
  select auth.uid() as user_id, windows.window_days
  from windows
  where auth.uid() is not null
), aggregates as (
  select
    owned_windows.user_id,
    owned_windows.window_days,
    count(sessions.id) filter (where sessions.outcome is not null) as ended_sessions,
    count(sessions.id) filter (where sessions.outcome = 'completed') as completed_sessions,
    coalesce(sum(sessions.honest_minutes), 0)::integer as honest_minutes,
    coalesce(sum(sessions.earned_block::integer), 0)::integer as earned_blocks
  from owned_windows
  left join public.sessions
    on sessions.owner_id = owned_windows.user_id
   and sessions.started_at >= now() - make_interval(days => owned_windows.window_days)
  group by owned_windows.user_id, owned_windows.window_days
)
select
  user_id,
  window_days,
  (current_date - (window_days - 1))::date as window_start,
  ended_sessions,
  completed_sessions,
  honest_minutes,
  earned_blocks,
  case when ended_sessions = 0 then 0::numeric
       else round(completed_sessions::numeric / ended_sessions::numeric, 4)
  end as completion_rate
from aggregates;

create view public.weekly_leaderboard as
with visible_users as (
  select auth.uid() as user_id
  where auth.uid() is not null
  union
  select case when friendships.requester_id = auth.uid()
              then friendships.addressee_id else friendships.requester_id end
  from public.friendships
  where friendships.status = 'accepted'
    and (friendships.requester_id = auth.uid() or friendships.addressee_id = auth.uid())
)
select
  sessions.owner_id as user_id,
  profiles.display_name,
  date_trunc('week', sessions.started_at at time zone 'UTC')::date as week_start,
  count(*) filter (where sessions.earned_block) as earned_blocks,
  coalesce(sum(sessions.honest_minutes), 0)::integer as honest_minutes
from public.sessions
join visible_users on visible_users.user_id = sessions.owner_id
join public.profiles on profiles.id = sessions.owner_id
where sessions.outcome is not null
group by sessions.owner_id, profiles.display_name, date_trunc('week', sessions.started_at at time zone 'UTC')::date;

create view public.focus_hours_heatmap as
select
  sessions.owner_id as user_id,
  extract(isodow from sessions.started_at at time zone 'UTC')::integer as day_of_week,
  extract(hour from sessions.started_at at time zone 'UTC')::integer as hour_of_day,
  count(*)::integer as session_count,
  coalesce(sum(sessions.honest_minutes), 0)::integer as honest_minutes,
  coalesce(sum(sessions.earned_block::integer), 0)::integer as earned_blocks
from public.sessions
where sessions.owner_id = auth.uid()
group by sessions.owner_id,
  extract(isodow from sessions.started_at at time zone 'UTC'),
  extract(hour from sessions.started_at at time zone 'UTC');

create view public.estimate_vs_actual as
select
  'task'::text as scope,
  tasks.id as scope_id,
  tasks.owner_id as user_id,
  tasks.id as task_id,
  tasks.goal_id,
  tasks.title as label,
  tasks.estimated_blocks::integer as estimated_blocks,
  coalesce(sum(sessions.earned_block::integer), 0)::integer as actual_blocks,
  coalesce(sum(sessions.honest_minutes), 0)::integer as actual_honest_minutes
from public.tasks
left join public.sessions on sessions.task_id = tasks.id
where tasks.owner_id = auth.uid()
group by tasks.id, tasks.owner_id, tasks.goal_id, tasks.title, tasks.estimated_blocks
union all
select
  'goal'::text as scope,
  goals.id as scope_id,
  goals.owner_id as user_id,
  null::uuid as task_id,
  goals.id as goal_id,
  goals.title as label,
  coalesce(sum(tasks.estimated_blocks), 0)::integer as estimated_blocks,
  coalesce(sum(sessions.earned_block::integer), 0)::integer as actual_blocks,
  coalesce(sum(sessions.honest_minutes), 0)::integer as actual_honest_minutes
from public.goals
left join public.tasks on tasks.goal_id = goals.id
left join public.sessions on sessions.task_id = tasks.id
where goals.owner_id = auth.uid()
group by goals.id, goals.owner_id, goals.title;

revoke all on table public.profiles, public.friendships, public.goals, public.tasks,
  public.sessions, public.day_records, public.forgiveness_tokens from anon;
revoke all on table public.profiles, public.friendships, public.goals, public.tasks,
  public.sessions, public.day_records, public.forgiveness_tokens from authenticated;
grant select, insert, update, delete on table public.profiles, public.friendships, public.goals,
  public.tasks, public.sessions, public.day_records, public.forgiveness_tokens to authenticated;
revoke all on public.rolling_rates, public.weekly_leaderboard, public.focus_hours_heatmap,
  public.estimate_vs_actual from anon;
grant select on public.rolling_rates, public.weekly_leaderboard, public.focus_hours_heatmap,
  public.estimate_vs_actual to authenticated;
