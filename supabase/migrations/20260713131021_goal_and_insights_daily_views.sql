-- Seven-day UTC focus rollups for goal meters and the v2 Insights trend.
-- Both views are scoped directly to auth.uid() and preserve empty calendar days.

create or replace view public.goal_daily_focus
with (security_invoker = true) as
with params as (
  select auth.uid() as user_id, (now() at time zone 'UTC')::date as utc_today
  where auth.uid() is not null
), calendar_days as (
  select params.user_id, day::date as focus_date
  from params
  cross join lateral generate_series(
    (params.utc_today - 6)::timestamp,
    params.utc_today::timestamp,
    interval '1 day'
  ) as day
), owned_goals as (
  select goals.owner_id as user_id, goals.id as goal_id
  from params
  join public.goals
    on goals.owner_id = params.user_id
   and goals.archived_at is null
)
select
  calendar_days.user_id,
  owned_goals.goal_id,
  calendar_days.focus_date,
  coalesce(sum(sessions.honest_minutes), 0)::integer as honest_minutes,
  coalesce(sum(sessions.earned_block::integer), 0)::integer as earned_blocks,
  count(sessions.id)::integer as sessions_ended
from calendar_days
cross join owned_goals
left join public.tasks
  on tasks.goal_id = owned_goals.goal_id
 and tasks.owner_id = owned_goals.user_id
left join public.sessions
  on sessions.task_id = tasks.id
 and sessions.owner_id = tasks.owner_id
 and sessions.started_at >= (calendar_days.focus_date::timestamp at time zone 'UTC')
 and sessions.started_at < ((calendar_days.focus_date + 1)::timestamp at time zone 'UTC')
 and sessions.ended_at is not null
group by calendar_days.user_id, owned_goals.goal_id, calendar_days.focus_date;

create or replace view public.daily_focus_trend
with (security_invoker = true) as
with params as (
  select auth.uid() as user_id, (now() at time zone 'UTC')::date as utc_today
  where auth.uid() is not null
), calendar_days as (
  select params.user_id, day::date as focus_date
  from params
  cross join lateral generate_series(
    (params.utc_today - 6)::timestamp,
    params.utc_today::timestamp,
    interval '1 day'
  ) as day
)
select
  calendar_days.user_id,
  calendar_days.focus_date,
  coalesce(sum(sessions.honest_minutes), 0)::integer as honest_minutes,
  coalesce(sum(sessions.earned_block::integer), 0)::integer as earned_blocks,
  count(sessions.id) filter (where sessions.outcome = 'completed')::integer as completed_sessions,
  count(sessions.id) filter (where sessions.outcome = 'abandoned')::integer as abandoned_sessions
from calendar_days
left join public.sessions
  on sessions.owner_id = calendar_days.user_id
 and sessions.started_at >= (calendar_days.focus_date::timestamp at time zone 'UTC')
 and sessions.started_at < ((calendar_days.focus_date + 1)::timestamp at time zone 'UTC')
 and sessions.ended_at is not null
group by calendar_days.user_id, calendar_days.focus_date;

revoke all on public.goal_daily_focus from anon;
grant select on public.goal_daily_focus to authenticated;
revoke all on public.daily_focus_trend from anon;
grant select on public.daily_focus_trend to authenticated;
