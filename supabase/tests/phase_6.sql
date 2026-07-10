begin;

select plan(18);

select has_column('public', 'forgiveness_tokens', 'used_for_date', 'forgiveness records the forgiven day');
select has_view('public', 'motivation_status', 'motivation status view exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

insert into public.day_records (owner_id, record_date, morning_task_ids, plan_match)
values
  ('00000000-0000-0000-0000-000000000001', current_date - 1, '{}', true),
  ('00000000-0000-0000-0000-000000000001', current_date - 2, '{}', false),
  ('00000000-0000-0000-0000-000000000001', current_date - 8, '{}', true),
  ('00000000-0000-0000-0000-000000000001', current_date - 31, '{}', true)
on conflict (owner_id, record_date) do update set plan_match = excluded.plan_match;

select is(
  (select closed_days from public.rolling_rates where window_days = 7),
  3::bigint,
  'seven-day rate denominator contains only closed days'
);
select is(
  (select met_days from public.rolling_rates where window_days = 7),
  2::bigint,
  'seven-day rate counts met closed days'
);
select is(
  (select completion_rate from public.rolling_rates where window_days = 7),
  0.6667::numeric,
  'seven-day rate is met days divided by closed days'
);
select is(
  (select closed_days from public.rolling_rates where window_days = 30),
  4::bigint,
  'thirty-day rate has its own rolling window'
);

select lives_ok($$select public.apply_forgiveness_token('phase 6 auto')$$, 'one weekly token applies');
select is(
  (select used_for_date from public.forgiveness_tokens
   where owner_id = '00000000-0000-0000-0000-000000000001'
     and week_start = date_trunc('week', current_date)::date),
  current_date,
  'token marks the current missed day'
);
select throws_ok($$select public.apply_forgiveness_token('second')$$, '23514', null, 'only one token applies per week');

select is((select streak_days from public.motivation_status), 2, 'streak counts met days and forgiven current day');
select is((select never_miss_twice from public.motivation_status), false, 'single miss does not trigger never miss twice');
select is((select days_silent is not null from public.motivation_status), true, 'silence signal is exposed');
select is((select welcome_back from public.motivation_status), false, 'recent activity is not welcome back');

select is(
  (select count(*) from public.weekly_leaderboard where user_id = '00000000-0000-0000-0000-000000000001'),
  1::bigint,
  'leaderboard includes the authenticated user for the current week'
);
select is(
  (select count(*) from public.weekly_leaderboard where week_start <> date_trunc('week', now() at time zone 'UTC')::date),
  0::bigint,
  'leaderboard is scoped to the current ISO week'
);
select ok(
  not exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'weekly_leaderboard'
                and column_name in ('task_title', 'note', 'reflection')),
  'leaderboard exposes no task or reflection fields'
);

set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*) from public.tasks where owner_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  'friend cannot select another users task titles'
);
select is(
  (select count(*) from public.day_records where owner_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  'friend cannot select another users reflections'
);

select * from finish();
rollback;
