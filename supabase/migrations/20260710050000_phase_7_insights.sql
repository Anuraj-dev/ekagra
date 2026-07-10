-- Phase 7 insights. Every calendar boundary is UTC and every view is scoped
-- directly to auth.uid(); analytics stay in SQL rather than reporting code.

create view public.identity_role_hours as
select
  sessions.owner_id as user_id,
  goals.identity_role,
  date_trunc('week', sessions.started_at at time zone 'UTC')::date as week_start,
  coalesce(sum(sessions.honest_minutes), 0)::integer as honest_minutes,
  coalesce(sum(sessions.earned_block::integer), 0)::integer as earned_blocks
from public.sessions
join public.tasks
  on tasks.id = sessions.task_id
 and tasks.owner_id = sessions.owner_id
join public.goals
  on goals.id = tasks.goal_id
 and goals.owner_id = sessions.owner_id
where sessions.owner_id = auth.uid()
  and sessions.ended_at is not null
group by sessions.owner_id, goals.identity_role,
  date_trunc('week', sessions.started_at at time zone 'UTC')::date;

create view public.distraction_breakdown as
select
  sessions.owner_id as user_id,
  date_trunc('week', sessions.started_at at time zone 'UTC')::date as week_start,
  sessions.distraction_tag,
  count(*)::bigint as abandoned_sessions,
  coalesce(sum(sessions.honest_minutes), 0)::integer as honest_minutes_lost
from public.sessions
where sessions.owner_id = auth.uid()
  and sessions.outcome = 'abandoned'
group by sessions.owner_id,
  date_trunc('week', sessions.started_at at time zone 'UTC')::date,
  sessions.distraction_tag;

create view public.weekly_review as
with owned_weeks as (
  select date_trunc('week', sessions.started_at at time zone 'UTC')::date as week_start
  from public.sessions
  where sessions.owner_id = auth.uid() and sessions.ended_at is not null
  union
  select date_trunc('week', day_records.record_date::timestamp)::date
  from public.day_records
  where day_records.owner_id = auth.uid()
  union
  select date_trunc('week', tasks.completed_at at time zone 'UTC')::date
  from public.tasks
  where tasks.owner_id = auth.uid() and tasks.completed_at is not null
), day_aggregates as (
  select
    date_trunc('week', day_records.record_date::timestamp)::date as week_start,
    count(*) filter (where day_records.plan_match is not null)::bigint as closed_days,
    count(*) filter (where day_records.plan_match)::bigint as met_days
  from public.day_records
  where day_records.owner_id = auth.uid()
  group by date_trunc('week', day_records.record_date::timestamp)::date
), session_aggregates as (
  select
    date_trunc('week', sessions.started_at at time zone 'UTC')::date as week_start,
    coalesce(sum(sessions.earned_block::integer), 0)::integer as earned_blocks,
    coalesce(sum(sessions.honest_minutes), 0)::integer as honest_minutes,
    count(*) filter (where sessions.outcome = 'completed')::bigint as completed_sessions,
    count(*) filter (where sessions.outcome = 'abandoned')::bigint as abandoned_sessions
  from public.sessions
  where sessions.owner_id = auth.uid() and sessions.ended_at is not null
  group by date_trunc('week', sessions.started_at at time zone 'UTC')::date
), distraction_counts as (
  select
    date_trunc('week', sessions.started_at at time zone 'UTC')::date as week_start,
    sessions.distraction_tag,
    count(*)::bigint as distraction_count
  from public.sessions
  where sessions.owner_id = auth.uid() and sessions.outcome = 'abandoned'
  group by date_trunc('week', sessions.started_at at time zone 'UTC')::date,
    sessions.distraction_tag
), ranked_distractions as (
  select
    distraction_counts.*,
    row_number() over (
      partition by distraction_counts.week_start
      order by distraction_counts.distraction_count desc,
        distraction_counts.distraction_tag asc
    ) as rank
  from distraction_counts
), task_actuals as (
  select
    tasks.id,
    tasks.completed_at,
    tasks.estimated_blocks,
    coalesce(sum(sessions.earned_block::integer), 0)::integer as actual_blocks
  from public.tasks
  left join public.sessions
    on sessions.task_id = tasks.id
   and sessions.owner_id = tasks.owner_id
   and sessions.ended_at is not null
  where tasks.owner_id = auth.uid() and tasks.completed_at is not null
  group by tasks.id, tasks.completed_at, tasks.estimated_blocks
), estimate_aggregates as (
  select
    date_trunc('week', task_actuals.completed_at at time zone 'UTC')::date as week_start,
    coalesce(sum(task_actuals.estimated_blocks), 0)::integer as estimated_blocks,
    coalesce(sum(task_actuals.actual_blocks), 0)::integer as actual_blocks
  from task_actuals
  group by date_trunc('week', task_actuals.completed_at at time zone 'UTC')::date
)
select
  auth.uid() as user_id,
  owned_weeks.week_start,
  coalesce(day_aggregates.closed_days, 0)::bigint as closed_days,
  coalesce(day_aggregates.met_days, 0)::bigint as met_days,
  coalesce(session_aggregates.earned_blocks, 0)::integer as earned_blocks,
  coalesce(session_aggregates.honest_minutes, 0)::integer as honest_minutes,
  coalesce(session_aggregates.completed_sessions, 0)::bigint as completed_sessions,
  coalesce(session_aggregates.abandoned_sessions, 0)::bigint as abandoned_sessions,
  ranked_distractions.distraction_tag as top_distraction_tag,
  coalesce(estimate_aggregates.estimated_blocks, 0)::integer as estimated_blocks,
  coalesce(estimate_aggregates.actual_blocks, 0)::integer as actual_blocks
from owned_weeks
left join day_aggregates using (week_start)
left join session_aggregates using (week_start)
left join ranked_distractions
  on ranked_distractions.week_start = owned_weeks.week_start
 and ranked_distractions.rank = 1
left join estimate_aggregates using (week_start)
where auth.uid() is not null;

create view public.ritual_correlations as
with params as (
  select auth.uid() as user_id, (now() at time zone 'UTC')::date as utc_today
  where auth.uid() is not null
), calendar_days as (
  select params.user_id, day::date as record_date
  from params
  cross join lateral generate_series(
    (params.utc_today - 59)::timestamp,
    params.utc_today::timestamp,
    interval '1 day'
  ) as day
), day_facts as (
  select
    calendar_days.user_id,
    calendar_days.record_date,
    (day_records.owner_id is not null
      and cardinality(day_records.morning_task_ids) > 0) as morning_commit_done,
    (day_records.plan_match is not null) as evening_close_done,
    coalesce(sum(sessions.earned_block::integer), 0)::integer as earned_blocks
  from calendar_days
  left join public.day_records
    on day_records.owner_id = calendar_days.user_id
   and day_records.record_date = calendar_days.record_date
  left join public.sessions
    on sessions.owner_id = calendar_days.user_id
   and sessions.started_at >= (calendar_days.record_date::timestamp at time zone 'UTC')
   and sessions.started_at < ((calendar_days.record_date + 1)::timestamp at time zone 'UTC')
   and sessions.ended_at is not null
  group by calendar_days.user_id, calendar_days.record_date,
    day_records.owner_id, day_records.morning_task_ids, day_records.plan_match
), signals as (
  select day_facts.user_id, day_facts.record_date, day_facts.earned_blocks,
    signal.signal, signal.adherent
  from day_facts
  cross join lateral (
    values
      ('morning_commit'::text, day_facts.morning_commit_done),
      ('evening_close'::text, day_facts.evening_close_done)
  ) as signal(signal, adherent)
), aggregates as (
  select
    signals.user_id,
    signals.signal,
    count(*) filter (where signals.adherent)::integer as days_with,
    count(*) filter (where not signals.adherent)::integer as days_without,
    coalesce(avg(signals.earned_blocks) filter (where signals.adherent), 0::numeric)
      as avg_blocks_with,
    coalesce(avg(signals.earned_blocks) filter (where not signals.adherent), 0::numeric)
      as avg_blocks_without
  from signals
  group by signals.user_id, signals.signal
)
select
  aggregates.user_id,
  aggregates.signal,
  aggregates.days_with,
  aggregates.days_without,
  round(aggregates.avg_blocks_with, 4) as avg_blocks_with,
  round(aggregates.avg_blocks_without, 4) as avg_blocks_without,
  round(aggregates.avg_blocks_with - aggregates.avg_blocks_without, 4) as lift
from aggregates;

revoke all on public.identity_role_hours from anon;
grant select on public.identity_role_hours to authenticated;
revoke all on public.distraction_breakdown from anon;
grant select on public.distraction_breakdown to authenticated;
revoke all on public.weekly_review from anon;
grant select on public.weekly_review to authenticated;
revoke all on public.ritual_correlations from anon;
grant select on public.ritual_correlations to authenticated;
