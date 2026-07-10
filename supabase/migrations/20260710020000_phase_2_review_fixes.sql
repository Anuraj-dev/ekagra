-- Keep device polling on compact, one-row database responses. The service-role
-- Edge Function is the only caller because it has already authenticated the
-- device token and resolved its owner.
create or replace function public.get_device_poll_aggregates(p_owner_id uuid)
returns table(today_blocks integer, weekly_minutes integer)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      ((now() at time zone 'UTC')::date at time zone 'UTC') as today_start,
      (date_trunc('week', now() at time zone 'UTC') at time zone 'UTC') as week_start
  )
  select
    count(*) filter (where sessions.outcome = 'completed' and sessions.started_at >= bounds.today_start)::integer,
    coalesce(
      sum(sessions.honest_minutes) filter (
        where sessions.ended_at is not null and sessions.started_at >= bounds.week_start
      ),
      0
    )::integer
  from public.sessions
  cross join bounds
  where sessions.owner_id = p_owner_id
    and sessions.started_at >= bounds.week_start;
$$;

revoke all on function public.get_device_poll_aggregates(uuid) from public;
grant execute on function public.get_device_poll_aggregates(uuid) to service_role;

-- Morning commit is one transaction: validation, clearing the old plan,
-- applying the new plan, and recording the day all succeed or all roll back.
create or replace function public.commit_morning_plan(p_owner_id uuid, p_task_ids uuid[])
returns public.day_records
language plpgsql
security definer
set search_path = public
as $$
declare
  day_record public.day_records;
begin
  if p_owner_id is null
     or coalesce(array_length(p_task_ids, 1), 0) not between 1 and 3 then
    raise exception using
      errcode = '23514',
      message = 'morning commit must contain between 1 and 3 tasks';
  end if;

  if exists (
    select task_id
    from unnest(p_task_ids) as requested(task_id)
    group by task_id
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23514',
      message = 'morning commit tasks must be unique';
  end if;

  if exists (
    select 1
    from unnest(p_task_ids) as requested(task_id)
    left join public.tasks
      on tasks.id = requested.task_id
     and tasks.owner_id = p_owner_id
    where tasks.id is null or tasks.status not in ('inbox', 'planned')
  ) then
    raise exception using
      errcode = '23514',
      message = 'morning commit tasks must belong to you and be open';
  end if;

  update public.tasks
  set status = 'inbox'
  where owner_id = p_owner_id and status = 'planned';

  update public.tasks
  set status = 'planned'
  where owner_id = p_owner_id and id = any(p_task_ids);

  insert into public.day_records (owner_id, morning_task_ids)
  values (p_owner_id, p_task_ids)
  on conflict (owner_id, record_date) do update
    set morning_task_ids = excluded.morning_task_ids
  returning * into day_record;

  return day_record;
end;
$$;

revoke all on function public.commit_morning_plan(uuid, uuid[]) from public;
grant execute on function public.commit_morning_plan(uuid, uuid[]) to service_role;
