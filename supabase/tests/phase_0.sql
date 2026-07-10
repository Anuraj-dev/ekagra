begin;

select plan(20);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'tasks', 'tasks table exists');
select has_table('public', 'sessions', 'sessions table exists');
select has_view('public', 'rolling_rates', 'rolling rates view exists');
select has_view('public', 'weekly_leaderboard', 'leaderboard view exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$insert into public.friendships (id, requester_id, addressee_id, status)
    values ('40000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000003',
            'accepted')$$,
  '42501',
  null,
  'requester cannot insert an accepted friendship'
);
select lives_ok(
  $$insert into public.friendships (id, requester_id, addressee_id, status)
    values ('40000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000003',
            'pending')$$,
  'requester can insert a pending friendship'
);
update public.friendships
set status = 'accepted'
where id = '40000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.friendships
   where id = '40000000-0000-0000-0000-000000000001' and status = 'accepted'),
  0::bigint,
  'requester cannot update their own friendship request'
);
select is(
  (select status from public.friendships where id = '40000000-0000-0000-0000-000000000001'),
  'pending',
  'requester friendship remains pending'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$update public.friendships
    set status = 'declined'
    where id = '40000000-0000-0000-0000-000000000001'$$,
  'addressee can decline a friendship request'
);
select throws_ok(
  $$update public.friendships
    set requester_id = '00000000-0000-0000-0000-000000000002'
    where id = '40000000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'friendship participants cannot be changed'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$insert into public.tasks (owner_id, title, goal_id)
    values ('00000000-0000-0000-0000-000000000001',
            'Cross-owner goal task',
            '10000000-0000-0000-0000-000000000002')$$,
  '23514',
  null,
  'task cannot reference another owner goal'
);

select is(
  (select completed_sessions from public.rolling_rates where window_days = 7),
  2::bigint,
  'seven-day rate counts completed sessions'
);
select is(
  (select earned_blocks from public.weekly_leaderboard where user_id = '00000000-0000-0000-0000-000000000001'),
  2::bigint,
  'leaderboard counts earned blocks'
);
select is(
  (select actual_blocks from public.estimate_vs_actual where scope = 'task' and task_id = '20000000-0000-0000-0000-000000000001'),
  2,
  'estimate view counts actual blocks'
);
select is(
  (select actual_blocks from public.estimate_vs_actual
   where scope = 'goal' and goal_id = '10000000-0000-0000-0000-000000000001'),
  2,
  'estimate view scopes goal sessions to the goal owner'
);
select ok(
  not exists (
    select 1 from public.weekly_leaderboard
    where user_id = '00000000-0000-0000-0000-000000000003'
  ),
  'leaderboard does not expose a non-friend'
);
select is(
  (select sum(honest_minutes) from public.focus_hours_heatmap),
  60::bigint,
  'heatmap includes owner honest minutes, including abandoned time'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*) from public.tasks where owner_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  'friends cannot query another owner task rows'
);
select is(
  (select count(*) from public.day_records where owner_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  'friends cannot query another owner reflections'
);

select * from finish();
rollback;
