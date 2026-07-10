-- Phase 6 motivation layer.
-- A day is closed when plan_match is non-null (the evening-close ritual is the
-- only writer). A closed day meets its plan when plan_match is true; the
-- morning_task_ids array is retained as the plan's task set and its cardinality
-- is exposed for clients, but is not treated as a block count because a task
-- may require more than one earned block. Thus a missed/closed day dents a
-- rolling rate by one denominator day and never resets progress to zero.
alter table public.forgiveness_tokens
  add column if not exists used_for_date date;

create index if not exists forgiveness_tokens_owner_used_date_idx
  on public.forgiveness_tokens (owner_id, used_for_date);

create or replace function public.apply_forgiveness_token(p_reason text default null)
returns public.forgiveness_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  token public.forgiveness_tokens;
  owner uuid := auth.uid();
  utc_today date := (now() at time zone 'utc')::date;
  week date := date_trunc('week', now() at time zone 'utc')::date;
  target_date date;
begin
  if owner is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  insert into public.forgiveness_tokens (owner_id, week_start)
  values (owner, week)
  on conflict (owner_id, week_start) do nothing;

  select * into token
  from public.forgiveness_tokens
  where owner_id = owner and week_start = week
  for update;

  if token.used_at is not null then
    raise exception using errcode = '23514', message = 'forgiveness token already used';
  end if;

  -- A closed plan_match=false day is an explicit miss. A missing date before
  -- today is also eligible once the user has made an earlier non-empty morning
  -- commitment in this ISO week; this treats gaps after tracking begins as
  -- misses without charging pre-onboarding days or an unfinished today.
  select max(candidate.day) into target_date
  from generate_series(week::timestamp, utc_today::timestamp, interval '1 day') as candidate(day)
  left join public.day_records d
    on d.owner_id = owner and d.record_date = candidate.day::date
  where d.plan_match = false
     or (
       candidate.day::date < utc_today
       and d.owner_id is null
       and exists (
         select 1
         from public.day_records earlier
         where earlier.owner_id = owner
           and earlier.record_date >= week
           and earlier.record_date < candidate.day::date
           and cardinality(earlier.morning_task_ids) > 0
       )
     );

  if target_date is null then
    raise exception using errcode = '23514', message = 'no eligible missed day this week';
  end if;

  update public.forgiveness_tokens
  set used_at = now(), used_for_date = target_date,
      reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = token.id
  returning * into token;
  return token;
end;
$$;

-- Keep the Crew intentionally small. Pending invitations do not consume a
-- slot; the accepted friendship count is capped for either participant.
create or replace function public.enforce_friendship_cap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'accepted' then
    -- Serialize every acceptance touching either participant. UUID order keeps
    -- overlapping acceptances from taking the two advisory locks in opposite
    -- order and deadlocking.
    perform pg_advisory_xact_lock(
      hashtextextended(least(new.requester_id, new.addressee_id)::text, 0)
    );
    perform pg_advisory_xact_lock(
      hashtextextended(greatest(new.requester_id, new.addressee_id)::text, 0)
    );

    if (select count(*) from public.friendships
        where status = 'accepted'
          and (requester_id = new.requester_id or addressee_id = new.requester_id)
          and id <> new.id) >= 12
       or (select count(*) from public.friendships
           where status = 'accepted'
             and (requester_id = new.addressee_id or addressee_id = new.addressee_id)
             and id <> new.id) >= 12 then
      raise exception using errcode = '23514', message = 'friend limit reached';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists friendships_enforce_cap on public.friendships;
create trigger friendships_enforce_cap
  before insert or update of status on public.friendships
  for each row execute function public.enforce_friendship_cap();

-- Phase 6 v1 uses UTC for every calendar boundary. Per-user timezone storage
-- and user-local day/week boundaries are deliberately deferred.
drop view if exists public.rolling_rates;
drop view if exists public.weekly_leaderboard;

create view public.rolling_rates as
with params as (
  select auth.uid() as user_id, (now() at time zone 'utc')::date as utc_today
), windows(window_days) as (
  values (7), (30)
), owned_windows as (
  select p.user_id, p.utc_today, w.window_days,
         (p.utc_today - (w.window_days - 1))::date as window_start
  from params p
  cross join windows w
  where p.user_id is not null
), day_aggregates as (
  select ow.user_id, ow.window_days,
         count(d.owner_id) filter (where d.plan_match is not null)::bigint as closed_days,
         count(d.owner_id) filter (where d.plan_match)::bigint as met_days,
         coalesce(sum(cardinality(d.morning_task_ids))
           filter (where d.plan_match is not null), 0)::integer as planned_tasks
  from owned_windows ow
  left join public.day_records d
    on d.owner_id = ow.user_id
   and d.record_date >= ow.window_start
   and d.record_date <= ow.utc_today
  group by ow.user_id, ow.window_days
), session_aggregates as (
  select ow.user_id, ow.window_days,
         count(s.id) filter (where s.ended_at is not null)::bigint as ended_sessions,
         count(s.id) filter (where s.outcome = 'completed')::bigint as completed_sessions,
         coalesce(sum(s.honest_minutes), 0)::integer as honest_minutes,
         coalesce(sum(s.earned_block::integer), 0)::integer as earned_blocks
  from owned_windows ow
  left join public.sessions s
    on s.owner_id = ow.user_id
   and s.started_at >= (ow.window_start::timestamp at time zone 'utc')
   and s.started_at < ((ow.utc_today + 1)::timestamp at time zone 'utc')
  group by ow.user_id, ow.window_days
)
select ow.user_id, ow.window_days, ow.window_start,
       d.closed_days, d.met_days,
       s.ended_sessions, s.completed_sessions,
       d.planned_tasks, s.earned_blocks, s.honest_minutes,
       case when d.closed_days = 0 then 0::numeric
            else round(d.met_days::numeric / d.closed_days::numeric, 4) end as completion_rate
from owned_windows ow
join day_aggregates d using (user_id, window_days)
join session_aggregates s using (user_id, window_days);

create view public.weekly_leaderboard as
with bounds as (
  select date_trunc('week', now() at time zone 'utc')::date as week_start
), visible_users as (
  select auth.uid() as user_id where auth.uid() is not null
  union
  select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  from public.friendships f
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
)
select s.owner_id as user_id, p.display_name,
       b.week_start,
       count(*) filter (where s.earned_block)::bigint as earned_blocks
from public.sessions s
join visible_users v on v.user_id = s.owner_id
join public.profiles p on p.id = s.owner_id
cross join bounds b
where s.started_at >= (b.week_start::timestamp at time zone 'utc')
  and s.started_at < ((b.week_start + 7)::timestamp at time zone 'utc')
  and s.ended_at is not null
group by s.owner_id, p.display_name, b.week_start;

-- A streak walks backward across consecutive UTC calendar dates. Closed
-- successes and forgiven dates count; an open, missing, or unforgiven missed
-- date stops the walk. An unfinished or missing today is skipped so the walk
-- begins at yesterday, while a closed miss today still breaks the streak.
create or replace view public.motivation_status as
with params as (
  select auth.uid() as user_id, (now() at time zone 'utc')::date as utc_today
  where auth.uid() is not null
), streak_bounds as (
  select p.user_id, p.utc_today,
         case when exists (
                     select 1 from public.day_records today
                     where today.owner_id = p.user_id
                       and today.record_date = p.utc_today
                       and today.plan_match is not null
                   )
              then p.utc_today else p.utc_today - 1 end as start_date
  from params p
), history_bounds as (
  select b.*,
         coalesce((
           select min(h.record_date)
           from (
             select d.record_date
             from public.day_records d
             where d.owner_id = b.user_id
               and d.plan_match is not null
               and d.record_date <= b.start_date
             union all
             select f.used_for_date
             from public.forgiveness_tokens f
             where f.owner_id = b.user_id
               and f.used_for_date is not null
               and f.used_for_date <= b.start_date
           ) h
         ), b.start_date) as earliest_date
  from streak_bounds b
), calendar_days as (
  select h.user_id, h.utc_today, day::date as record_date
  from history_bounds h
  cross join lateral generate_series(
    h.start_date::timestamp, h.earliest_date::timestamp, interval '-1 day'
  ) day
), day_states as (
  select c.user_id, c.utc_today, c.record_date,
         (d.plan_match is true or f.id is not null) as met
  from calendar_days c
  left join public.day_records d
    on d.owner_id = c.user_id and d.record_date = c.record_date
  left join public.forgiveness_tokens f
    on f.owner_id = c.user_id and f.used_for_date = c.record_date
), continuity as (
  select ds.*,
         bool_and(ds.met) over (
           partition by ds.user_id order by ds.record_date desc
           rows between unbounded preceding and current row
         ) as remains_continuous
  from day_states ds
), streaks as (
  select c.user_id as owner_id,
         count(*) filter (where c.remains_continuous)::integer as streak_days
  from continuity c
  group by c.user_id
), closed_days as (
  select d.owner_id, d.record_date,
         (d.plan_match or f.id is not null) as met
  from public.day_records d
  left join public.forgiveness_tokens f
    on f.owner_id = d.owner_id and f.used_for_date = d.record_date
  where d.plan_match is not null
), recent_misses as (
  select p.user_id as owner_id,
         case when exists (
                select 1 from closed_days first_miss
                join closed_days second_miss
                  on second_miss.owner_id = first_miss.owner_id
                 and second_miss.record_date = first_miss.record_date - 1
                where first_miss.owner_id = p.user_id
                  and first_miss.record_date >= p.utc_today - 1
                  and not first_miss.met and not second_miss.met
              ) then 2 else 0 end as recent_misses
  from params p
), activity as (
  select p.id as owner_id, greatest(
    coalesce(max(s.started_at), '-infinity'::timestamptz),
    coalesce(max(d.updated_at), '-infinity'::timestamptz)
  ) as last_activity_at
  from public.profiles p
  left join public.sessions s on s.owner_id = p.id
  left join public.day_records d on d.owner_id = p.id
  group by p.id
)
select a.owner_id as user_id,
       coalesce(st.streak_days, 0)::integer as streak_days,
       coalesce(rm.recent_misses, 0)::integer as recent_misses,
       (coalesce(rm.recent_misses, 0) >= 2) as never_miss_twice,
       case when a.last_activity_at = '-infinity'::timestamptz then null
            else floor(extract(epoch from (now() - a.last_activity_at)) / 86400)::integer end as days_silent,
       (a.last_activity_at <> '-infinity'::timestamptz
        and now() - a.last_activity_at >= interval '7 days') as welcome_back
from activity a
left join streaks st on st.owner_id = a.owner_id
left join recent_misses rm on rm.owner_id = a.owner_id
where a.owner_id = auth.uid();

revoke all on public.rolling_rates, public.weekly_leaderboard, public.motivation_status from anon;
grant select on public.rolling_rates, public.weekly_leaderboard, public.motivation_status to authenticated;
revoke all on public.forgiveness_tokens from authenticated;
grant select on public.forgiveness_tokens to authenticated;
