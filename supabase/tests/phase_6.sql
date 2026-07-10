begin;

select plan(25);

select has_column('public', 'forgiveness_tokens', 'used_for_date', 'forgiveness records the forgiven day');
select has_view('public', 'motivation_status', 'motivation status view exists');

-- Direct writes to day_records and sessions are revoked from authenticated.
-- Build every fixture as postgres before switching roles for API/RLS assertions.
delete from public.day_records
where owner_id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

delete from public.forgiveness_tokens
where owner_id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

delete from public.sessions
where owner_id = '00000000-0000-0000-0000-000000000001';

with dates as (
  select (now() at time zone 'utc')::date as utc_today,
         date_trunc('week', now() at time zone 'utc')::date as week_start
), target as (
  select utc_today, greatest(utc_today - 2, week_start) as missed_date
  from dates
)
insert into public.day_records (owner_id, record_date, morning_task_ids, plan_match)
select '00000000-0000-0000-0000-000000000001'::uuid, day::date, '{}'::uuid[], day::date <> t.missed_date
from target t
cross join lateral generate_series(
  t.missed_date::timestamp, t.utc_today::timestamp, interval '1 day'
) day
union all
select '00000000-0000-0000-0000-000000000001'::uuid, utc_today - 6, '{}'::uuid[], true
from dates
union all
select '00000000-0000-0000-0000-000000000001'::uuid, utc_today - 8, '{}'::uuid[], true
from dates
union all
select '00000000-0000-0000-0000-000000000001'::uuid, utc_today - 31, '{}'::uuid[], true
from dates;

-- User 2 has two consecutive closed successes but no row for today. This is
-- both the open-today streak fixture and the no-eligible-forgiveness fixture.
with dates as (
  select (now() at time zone 'utc')::date as utc_today
)
insert into public.day_records (owner_id, record_date, morning_task_ids, plan_match)
select '00000000-0000-0000-0000-000000000002'::uuid, utc_today - offset_days,
       array['90000000-0000-0000-0000-000000000001']::uuid[], true
from dates
cross join (values (1), (2)) offsets(offset_days);

-- The completed session deliberately has no matching closed day. Both session
-- rows must contribute to UTC-window metrics independently of day closure.
with dates as (
  select (now() at time zone 'utc')::date as utc_today
)
insert into public.sessions (
  id, owner_id, task_id, started_at, ended_at, planned_minutes,
  outcome, distraction_tag, honest_minutes
)
select '50000000-0000-0000-0000-000000000006',
       '00000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001',
       ((utc_today - 4)::timestamp + interval '12 hours') at time zone 'utc',
       ((utc_today - 4)::timestamp + interval '12 hours 13 minutes') at time zone 'utc',
       25, 'completed', null, 13
from dates
union all
select '50000000-0000-0000-0000-000000000007',
       '00000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001',
       now() - interval '5 minutes', now(), 25, 'abandoned', 'energy', 5
from dates;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select is(
  (select closed_days from public.rolling_rates where window_days = 7),
  ((now() at time zone 'utc')::date
    - greatest(
        (now() at time zone 'utc')::date - 2,
        date_trunc('week', now() at time zone 'utc')::date
      ) + 2)::bigint,
  'seven-day rate denominator contains only closed days'
);
select is(
  (select met_days from public.rolling_rates where window_days = 7),
  ((now() at time zone 'utc')::date
    - greatest(
        (now() at time zone 'utc')::date - 2,
        date_trunc('week', now() at time zone 'utc')::date
      ) + 1)::bigint,
  'seven-day rate counts met closed days'
);
select is(
  (select completion_rate from public.rolling_rates where window_days = 7),
  round(
    ((now() at time zone 'utc')::date
      - greatest(
          (now() at time zone 'utc')::date - 2,
          date_trunc('week', now() at time zone 'utc')::date
        ) + 1)::numeric
    / ((now() at time zone 'utc')::date
      - greatest(
          (now() at time zone 'utc')::date - 2,
          date_trunc('week', now() at time zone 'utc')::date
        ) + 2)::numeric,
    4
  ),
  'seven-day rate is met days divided by closed days'
);
select is(
  (select closed_days from public.rolling_rates where window_days = 30),
  ((now() at time zone 'utc')::date
    - greatest(
        (now() at time zone 'utc')::date - 2,
        date_trunc('week', now() at time zone 'utc')::date
      ) + 3)::bigint,
  'thirty-day rate has its own rolling window'
);
select is(
  (select ended_sessions from public.rolling_rates where window_days = 7),
  2::bigint,
  'seven-day session aggregate includes ended sessions on open or missing days'
);
select is(
  (select completed_sessions from public.rolling_rates where window_days = 7),
  1::bigint,
  'seven-day session aggregate includes completed sessions independently of closure'
);
select is(
  (select earned_blocks from public.rolling_rates where window_days = 7),
  1,
  'seven-day session aggregate retains earned blocks from every session day'
);
select is(
  (select honest_minutes from public.rolling_rates where window_days = 7),
  18,
  'seven-day session aggregate retains honest minutes from every session day'
);

select is(
  (select streak_days from public.motivation_status),
  ((now() at time zone 'utc')::date
    - greatest(
        (now() at time zone 'utc')::date - 2,
        date_trunc('week', now() at time zone 'utc')::date
      ))::integer,
  'an unforgiven miss breaks the consecutive-day streak'
);
select lives_ok(
  $$select public.apply_forgiveness_token('phase 6 targeted')$$,
  'one weekly token applies to an eligible miss'
);
select is(
  (select used_for_date from public.forgiveness_tokens
   where owner_id = '00000000-0000-0000-0000-000000000001'
     and week_start = date_trunc('week', now() at time zone 'utc')::date),
  greatest(
    (now() at time zone 'utc')::date - 2,
    date_trunc('week', now() at time zone 'utc')::date
  ),
  'token targets the most recent eligible missed day'
);
select is(
  (select streak_days from public.motivation_status),
  ((now() at time zone 'utc')::date
    - greatest(
        (now() at time zone 'utc')::date - 2,
        date_trunc('week', now() at time zone 'utc')::date
      ) + 1)::integer,
  'forgiveness alone preserves the otherwise-broken streak'
);
select throws_ok(
  $$select public.apply_forgiveness_token('second')$$,
  '23514',
  'forgiveness token already used',
  'only one token applies per UTC ISO week'
);
select is((select never_miss_twice from public.motivation_status), false, 'single miss does not trigger never miss twice');
select is((select days_silent is not null from public.motivation_status), true, 'silence signal is exposed');
select is((select welcome_back from public.motivation_status), false, 'recent activity is not welcome back');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is(
  (select streak_days from public.motivation_status),
  2,
  'an open or missing today starts the streak walk from yesterday'
);
select throws_ok(
  $$select public.apply_forgiveness_token('nothing to forgive')$$,
  '23514',
  'no eligible missed day this week',
  'forgiveness rejects a week with no eligible miss'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.weekly_leaderboard where user_id = '00000000-0000-0000-0000-000000000001'),
  1::bigint,
  'leaderboard includes the authenticated user for the current week'
);
select is(
  (select count(*) from public.weekly_leaderboard
   where week_start <> date_trunc('week', now() at time zone 'utc')::date),
  0::bigint,
  'leaderboard is scoped to the current UTC ISO week'
);
select ok(
  not exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'weekly_leaderboard'
                and column_name in ('task_title', 'note', 'reflection')),
  'leaderboard exposes no task or reflection fields'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
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
reset role;

select * from finish();
rollback;
