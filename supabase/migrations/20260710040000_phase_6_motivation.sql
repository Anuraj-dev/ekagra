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
  week date := date_trunc('week', current_date)::date;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  insert into public.forgiveness_tokens (owner_id, week_start)
  values (auth.uid(), week)
  on conflict (owner_id, week_start) do nothing;

  update public.forgiveness_tokens
  set used_at = now(), used_for_date = current_date,
      reason = nullif(trim(coalesce(p_reason, '')), '')
  where owner_id = auth.uid() and week_start = week and used_at is null
  returning * into token;

  if token.id is null then
    raise exception using errcode = '23514', message = 'forgiveness token already used';
  end if;
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

drop view if exists public.rolling_rates;
drop view if exists public.weekly_leaderboard;

create view public.rolling_rates as
with windows(window_days) as (values (7), (30)),
closed_days as (
  select d.owner_id, d.record_date, d.plan_match,
         cardinality(d.morning_task_ids)::integer as planned_tasks,
         coalesce(sum(s.earned_block::integer), 0)::integer as earned_blocks
  from public.day_records d
  left join public.sessions s
    on s.owner_id = d.owner_id
   and s.started_at >= d.record_date::timestamptz
   and s.started_at < (d.record_date + 1)::timestamptz
   and s.ended_at is not null
  where d.plan_match is not null
  group by d.owner_id, d.record_date, d.plan_match, d.morning_task_ids
), aggregates as (
  select auth.uid() as user_id, w.window_days,
         count(c.record_date)::bigint as closed_days,
         count(c.record_date) filter (where c.plan_match)::bigint as met_days,
         coalesce(sum(c.earned_blocks), 0)::integer as earned_blocks,
         coalesce(sum(c.planned_tasks), 0)::integer as planned_tasks,
         (select count(*) from public.sessions s
          where s.owner_id = auth.uid() and s.ended_at is not null
            and s.started_at >= now() - make_interval(days => w.window_days))::bigint as ended_sessions,
         (select count(*) from public.sessions s
          where s.owner_id = auth.uid() and s.outcome = 'completed'
            and s.started_at >= now() - make_interval(days => w.window_days))::bigint as completed_sessions
  from windows w
  left join closed_days c
    on c.owner_id = auth.uid()
   and c.record_date >= current_date - (w.window_days - 1)
   and c.record_date <= current_date
  group by w.window_days
)
select user_id, window_days,
       (current_date - (window_days - 1))::date as window_start,
       closed_days, met_days,
       ended_sessions,
       completed_sessions,
       planned_tasks,
       earned_blocks,
       0::integer as honest_minutes,
       case when closed_days = 0 then 0::numeric
            else round(met_days::numeric / closed_days::numeric, 4) end as completion_rate
from aggregates
where auth.uid() is not null;

create view public.weekly_leaderboard as
with visible_users as (
  select auth.uid() as user_id where auth.uid() is not null
  union
  select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  from public.friendships f
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
)
select s.owner_id as user_id, p.display_name,
       date_trunc('week', now() at time zone 'UTC')::date as week_start,
       count(*) filter (where s.earned_block)::integer as earned_blocks
from public.sessions s
join visible_users v on v.user_id = s.owner_id
join public.profiles p on p.id = s.owner_id
where s.started_at >= date_trunc('week', now() at time zone 'UTC')
  and s.ended_at is not null
group by s.owner_id, p.display_name;

create or replace view public.motivation_status as
with days as (
  select d.owner_id, d.record_date, d.plan_match,
         (d.plan_match or exists (
           select 1 from public.forgiveness_tokens f
           where f.owner_id = d.owner_id and f.used_for_date = d.record_date)) as met
  from public.day_records d
  where d.plan_match is not null
), streaks as (
  select d.owner_id,
         count(*) filter (where d.met and d.record_date > coalesce(
           (select max(m.record_date) from days m where m.owner_id = d.owner_id and not m.met),
           '-infinity'::date))::integer as streak_days,
         case when exists (
                select 1 from days first_miss
                join days second_miss on second_miss.owner_id = first_miss.owner_id
                  and second_miss.record_date = first_miss.record_date - 1
                where first_miss.owner_id = d.owner_id
                  and first_miss.record_date >= current_date - 1
                  and not first_miss.met and not second_miss.met
              )
              then 2 else 0 end as recent_misses
  from days d
  group by d.owner_id
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
       coalesce(st.recent_misses, 0)::integer as recent_misses,
       (coalesce(st.recent_misses, 0) >= 2) as never_miss_twice,
       case when a.last_activity_at = '-infinity'::timestamptz then null
            else floor(extract(epoch from (now() - a.last_activity_at)) / 86400)::integer end as days_silent,
       (a.last_activity_at <> '-infinity'::timestamptz
        and now() - a.last_activity_at >= interval '7 days') as welcome_back
from activity a
left join streaks st on st.owner_id = a.owner_id
where a.owner_id = auth.uid();

revoke all on public.rolling_rates, public.weekly_leaderboard, public.motivation_status from anon;
grant select on public.rolling_rates, public.weekly_leaderboard, public.motivation_status to authenticated;
revoke all on public.forgiveness_tokens from authenticated;
grant select on public.forgiveness_tokens to authenticated;
