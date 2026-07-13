-- Task edits keep non-terminal status and scheduling coherent. Morning commit is
-- the deliberate exception: its "planned" status means committed for today,
-- not scheduled for a calendar date.

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
  elsif current_setting('ekagra.morning_commit_bypass', true) is distinct from 'on'
        and new.status not in ('done', 'cancelled') then
    new.status = case when new.scheduled_for is null then 'inbox' else 'planned' end;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_sync_status_with_schedule on public.tasks;
create trigger tasks_sync_status_with_schedule
  before insert or update of status, scheduled_for on public.tasks
  for each row execute function public.sync_task_status_with_schedule();

create or replace function public.commit_morning_plan(p_owner_id uuid, p_task_ids uuid[])
returns public.day_records
language plpgsql
security definer
set search_path = public
as $$
declare
  day_record public.day_records;
  previous_bypass text := current_setting('ekagra.morning_commit_bypass', true);
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

  begin
    perform set_config('ekagra.morning_commit_bypass', 'on', true);

    update public.tasks
    set status = 'inbox'
    where owner_id = p_owner_id and status = 'planned';

    update public.tasks
    set status = 'planned'
    where owner_id = p_owner_id and id = any(p_task_ids);

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
