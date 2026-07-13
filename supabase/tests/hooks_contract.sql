begin;

select plan(41);

select has_column('public', 'tasks', 'priority', 'tasks have priority');
select col_type_is('public', 'tasks', 'priority', 'text', 'task priority is text');
select has_column('public', 'tasks', 'scheduled_for', 'tasks have a scheduled date');
select col_type_is('public', 'tasks', 'scheduled_for', 'date', 'task scheduled date is date');
select has_column('public', 'tasks', 'scheduled_time', 'tasks have a scheduled time');
select col_type_is(
  'public',
  'tasks',
  'scheduled_time',
  'time without time zone',
  'task scheduled time is time without time zone'
);
select has_column('public', 'tasks', 'deadline', 'tasks have a deadline');
select col_type_is('public', 'tasks', 'deadline', 'date', 'task deadline is date');
select has_column('public', 'tasks', 'notes', 'tasks have notes');
select col_type_is('public', 'tasks', 'notes', 'text', 'task notes are text');
select has_column('public', 'tasks', 'client_op_id', 'tasks have a client operation id');
select col_type_is('public', 'tasks', 'client_op_id', 'uuid', 'task client operation id is uuid');

select has_column('public', 'goals', 'priority', 'goals have priority');
select col_type_is('public', 'goals', 'priority', 'text', 'goal priority is text');
select has_column('public', 'goals', 'client_op_id', 'goals have a client operation id');
select col_type_is('public', 'goals', 'client_op_id', 'uuid', 'goal client operation id is uuid');
select has_column('public', 'sessions', 'client_op_id', 'sessions have a client operation id');
select col_type_is('public', 'sessions', 'client_op_id', 'uuid', 'session client operation id is uuid');

-- Fixtures and constraint checks run as the transaction's superuser. Keep them
-- before any authenticated role switch so RLS cannot hide setup failures.
select throws_ok(
  $$insert into public.tasks (id, owner_id, title, priority)
    values ('61000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Invalid task priority',
            'p0')$$,
  '23514',
  null,
  'task priority rejects unsupported values'
);
select throws_ok(
  $$insert into public.goals (id, owner_id, title, identity_role, priority)
    values ('62000000-0000-0000-0000-000000000001'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Invalid goal priority',
            'Builder',
            'p0')$$,
  '23514',
  null,
  'goal priority rejects unsupported values'
);

select lives_ok(
  $$insert into public.tasks (id, owner_id, title, client_op_id)
    values ('61000000-0000-0000-0000-000000000002'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'First task operation',
            '63000000-0000-0000-0000-000000000001'::uuid)$$,
  'first task client operation succeeds'
);
select throws_ok(
  $$insert into public.tasks (id, owner_id, title, client_op_id)
    values ('61000000-0000-0000-0000-000000000003'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Duplicate task operation',
            '63000000-0000-0000-0000-000000000001'::uuid)$$,
  '23505',
  null,
  'duplicate task client operation is rejected for one owner'
);
select lives_ok(
  $$insert into public.tasks (id, owner_id, title, client_op_id)
    values ('61000000-0000-0000-0000-000000000004'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Null task operation one',
            null),
           ('61000000-0000-0000-0000-000000000005'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Null task operation two',
            null)$$,
  'multiple null task client operations succeed for one owner'
);

select lives_ok(
  $$insert into public.goals (id, owner_id, title, identity_role, client_op_id)
    values ('62000000-0000-0000-0000-000000000002'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'First goal operation',
            'Builder',
            '64000000-0000-0000-0000-000000000001'::uuid)$$,
  'first goal client operation succeeds'
);
select throws_ok(
  $$insert into public.goals (id, owner_id, title, identity_role, client_op_id)
    values ('62000000-0000-0000-0000-000000000003'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Duplicate goal operation',
            'Builder',
            '64000000-0000-0000-0000-000000000001'::uuid)$$,
  '23505',
  null,
  'duplicate goal client operation is rejected for one owner'
);
select lives_ok(
  $$insert into public.goals (id, owner_id, title, identity_role, client_op_id)
    values ('62000000-0000-0000-0000-000000000004'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Null goal operation one',
            'Builder',
            null),
           ('62000000-0000-0000-0000-000000000005'::uuid,
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Null goal operation two',
            'Builder',
            null)$$,
  'multiple null goal client operations succeed for one owner'
);

insert into public.tasks (id, owner_id, title, scheduled_for)
values
  ('61000000-0000-0000-0000-000000000006'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   'Scheduled task status',
   '2026-07-14'::date),
  ('61000000-0000-0000-0000-000000000007'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   'Inbox task status',
   null),
  ('61000000-0000-0000-0000-000000000008'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   'Done task status',
   '2026-07-14'::date);

update public.tasks
set status = 'done'
where id = '61000000-0000-0000-0000-000000000008'::uuid;

select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000006'::uuid),
  'planned',
  'creating a task with a schedule makes it planned'
);
select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000007'::uuid),
  'inbox',
  'creating a task without a schedule keeps it in inbox'
);

update public.tasks
set scheduled_for = '2026-07-15'::date
where id = '61000000-0000-0000-0000-000000000007'::uuid;
select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000007'::uuid),
  'planned',
  'scheduling an inbox task makes it planned'
);

update public.tasks
set scheduled_for = null
where id = '61000000-0000-0000-0000-000000000007'::uuid;
select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000007'::uuid),
  'inbox',
  'unscheduling a planned task returns it to inbox'
);

update public.tasks
set scheduled_for = null
where id = '61000000-0000-0000-0000-000000000008'::uuid;
select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000008'::uuid),
  'done',
  'schedule changes never override a done task'
);

-- A task PATCH can include status and schedule independently. Exercise the
-- database write shapes produced by all three incoherent combinations.
update public.tasks
set status = 'inbox', scheduled_for = '2026-07-15'::date
where id = '61000000-0000-0000-0000-000000000007'::uuid;
select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000007'::uuid),
  'planned',
  'an inbox status cannot override a schedule supplied in the same edit'
);

insert into public.tasks (id, owner_id, title)
values (
  '61000000-0000-0000-0000-000000000009'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Unscheduled status edit'
);
update public.tasks
set status = 'planned'
where id = '61000000-0000-0000-0000-000000000009'::uuid;
select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000009'::uuid),
  'inbox',
  'planned status without a schedule normalizes to inbox on task edit'
);

update public.tasks
set status = 'inbox'
where id = '61000000-0000-0000-0000-000000000006'::uuid;
select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000006'::uuid),
  'planned',
  'inbox status on an already scheduled task normalizes to planned'
);

insert into public.tasks (id, owner_id, title, status, scheduled_for)
values (
  '61000000-0000-0000-0000-000000000010'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Cancelled task status',
  'cancelled',
  null
);
update public.tasks
set scheduled_for = '2026-07-16'::date
where id in (
  '61000000-0000-0000-0000-000000000008'::uuid,
  '61000000-0000-0000-0000-000000000010'::uuid
);
select results_eq(
  $$select status from public.tasks
    where id in (
      '61000000-0000-0000-0000-000000000008'::uuid,
      '61000000-0000-0000-0000-000000000010'::uuid
    )
    order by status$$,
  $$values ('cancelled'::text), ('done'::text)$$,
  'schedule edits preserve done and cancelled statuses'
);

insert into public.tasks (id, owner_id, title)
values (
  '61000000-0000-0000-0000-000000000011'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Morning committed task'
);
select lives_ok(
  $$select public.commit_morning_plan(
    '00000000-0000-0000-0000-000000000001'::uuid,
    array['61000000-0000-0000-0000-000000000011']::uuid[]
  )$$,
  'morning commit can deliberately plan a task without a schedule'
);
select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000011'::uuid),
  'planned',
  'morning commit bypass preserves planned without a schedule'
);
update public.tasks
set title = 'Morning committed task renamed'
where id = '61000000-0000-0000-0000-000000000011'::uuid;
select is(
  (select status from public.tasks where id = '61000000-0000-0000-0000-000000000011'::uuid),
  'planned',
  'an unrelated edit does not revert a morning-committed task'
);

select lives_ok(
  $$insert into public.sessions (
      id, owner_id, task_id, client_op_id, started_at, ended_at, outcome, honest_minutes
    ) values (
      '65000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid,
      '61000000-0000-0000-0000-000000000006'::uuid,
      '66000000-0000-0000-0000-000000000001'::uuid,
      now() - interval '25 minutes', now(), 'completed', 25
    )$$,
  'first session client operation succeeds'
);
select throws_ok(
  $$insert into public.sessions (
      id, owner_id, task_id, client_op_id, started_at, ended_at, outcome, honest_minutes
    ) values (
      '65000000-0000-0000-0000-000000000002'::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid,
      '61000000-0000-0000-0000-000000000006'::uuid,
      '66000000-0000-0000-0000-000000000001'::uuid,
      now() - interval '20 minutes', now(), 'completed', 20
    )$$,
  '23505',
  null,
  'duplicate session client operation is rejected for one owner'
);
select lives_ok(
  $$insert into public.sessions (
      id, owner_id, task_id, client_op_id, started_at, ended_at, outcome, honest_minutes
    ) values
      ('65000000-0000-0000-0000-000000000003'::uuid,
       '00000000-0000-0000-0000-000000000001'::uuid,
       '61000000-0000-0000-0000-000000000006'::uuid,
       null, now() - interval '15 minutes', now(), 'completed', 15),
      ('65000000-0000-0000-0000-000000000004'::uuid,
       '00000000-0000-0000-0000-000000000001'::uuid,
       '61000000-0000-0000-0000-000000000006'::uuid,
       null, now() - interval '10 minutes', now(), 'completed', 10)$$,
  'multiple null session client operations succeed for one owner'
);

select * from finish();
rollback;
