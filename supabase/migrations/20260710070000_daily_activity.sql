-- Current-day activity. The calendar boundary is UTC and the view is scoped
-- directly to auth.uid(); analytics stay in SQL rather than reporting code.

create view public.daily_activity as
with params as (
  select auth.uid() as user_id, (now() at time zone 'UTC')::date as activity_date
  where auth.uid() is not null
)
select
  params.user_id,
  params.activity_date,
  coalesce(sum(sessions.earned_block::integer), 0)::integer as earned_blocks,
  coalesce(sum(sessions.honest_minutes), 0)::integer as honest_minutes
from params
left join public.sessions
  on sessions.owner_id = params.user_id
 and sessions.started_at >= (params.activity_date::timestamp at time zone 'UTC')
 and sessions.started_at < ((params.activity_date + 1)::timestamp at time zone 'UTC')
 and sessions.ended_at is not null
group by params.user_id, params.activity_date;

revoke all on public.daily_activity from anon;
grant select on public.daily_activity to authenticated;
