begin;

select plan(12);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'tasks', 'tasks table exists');
select has_table('public', 'sessions', 'sessions table exists');
select has_view('public', 'rolling_rates', 'rolling rates view exists');
select has_view('public', 'weekly_leaderboard', 'leaderboard view exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

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
