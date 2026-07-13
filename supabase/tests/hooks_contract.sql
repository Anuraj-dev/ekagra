begin;

select plan(24);

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

select * from finish();
rollback;
