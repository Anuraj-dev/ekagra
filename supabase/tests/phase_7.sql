begin;

select plan(62);

select has_view('public', 'daily_activity', 'daily activity view exists');
select has_column('public', 'daily_activity', 'user_id', 'daily activity exposes user id');
select has_column('public', 'daily_activity', 'activity_date', 'daily activity exposes activity date');
select has_column('public', 'daily_activity', 'earned_blocks', 'daily activity exposes earned blocks');
select has_column('public', 'daily_activity', 'honest_minutes', 'daily activity exposes honest minutes');
select col_type_is('public', 'daily_activity', 'user_id', 'uuid', 'daily activity user id is uuid');
select col_type_is('public', 'daily_activity', 'activity_date', 'date', 'daily activity date is date');
select col_type_is('public', 'daily_activity', 'earned_blocks', 'integer', 'daily activity earned blocks are integer');
select col_type_is('public', 'daily_activity', 'honest_minutes', 'integer', 'daily activity honest minutes are integer');

select has_view('public', 'identity_role_hours', 'identity role hours view exists');
select has_column('public', 'identity_role_hours', 'honest_minutes', 'identity role hours exposes honest minutes');
select has_view('public', 'distraction_breakdown', 'distraction breakdown view exists');
select has_column('public', 'distraction_breakdown', 'abandoned_sessions', 'distraction breakdown exposes abandoned count');
select has_view('public', 'weekly_review', 'weekly review view exists');
select has_column('public', 'weekly_review', 'top_distraction_tag', 'weekly review exposes top distraction');
select has_view('public', 'ritual_correlations', 'ritual correlations view exists');
select has_column('public', 'ritual_correlations', 'lift', 'ritual correlations exposes lift');

-- Direct writes to day_records and sessions are revoked from authenticated.
-- Build every fixture as postgres before switching roles for view/RLS assertions.
delete from public.sessions
where owner_id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

delete from public.day_records
where owner_id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

insert into public.goals (id, owner_id, title, identity_role)
values
  ('17000000-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid, 'Build insight fixture', 'Builder'),
  ('17000000-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid, 'Learn insight fixture', 'Learner'),
  ('17000000-0000-0000-0000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid, 'Private other fixture', 'Private');

insert into public.tasks (
  id, owner_id, title, status, goal_id, estimated_blocks, completed_at
)
values
  ('27000000-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid, 'Completed estimate', 'done',
   '17000000-0000-0000-0000-000000000001'::uuid, 3,
   (date_trunc('week', now() at time zone 'UTC') - interval '5 days') at time zone 'UTC'),
  ('27000000-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid, 'Learner task', 'planned',
   '17000000-0000-0000-0000-000000000002'::uuid, 2, null),
  ('27000000-0000-0000-0000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid, 'Private other task', 'done',
   '17000000-0000-0000-0000-000000000003'::uuid, 9,
   (date_trunc('week', now() at time zone 'UTC') - interval '5 days') at time zone 'UTC');

insert into public.day_records (
  owner_id, record_date, morning_task_ids, plan_match, went_wrong_tag
)
values
  ('00000000-0000-0000-0000-000000000001'::uuid,
   (date_trunc('week', now() at time zone 'UTC')::date - 7),
   array['27000000-0000-0000-0000-000000000001']::uuid[], true, null),
  ('00000000-0000-0000-0000-000000000001'::uuid,
   (date_trunc('week', now() at time zone 'UTC')::date - 6),
   '{}'::uuid[], false, 'energy'),
  ('00000000-0000-0000-0000-000000000002'::uuid,
   (date_trunc('week', now() at time zone 'UTC')::date - 7),
   array['27000000-0000-0000-0000-000000000003']::uuid[], true, null);

insert into public.sessions (
  id, owner_id, task_id, started_at, ended_at, planned_minutes,
  outcome, distraction_tag, honest_minutes
)
values
  ('57000000-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '27000000-0000-0000-0000-000000000001'::uuid,
   (date_trunc('week', now() at time zone 'UTC') - interval '7 days' + interval '9 hours') at time zone 'UTC',
   (date_trunc('week', now() at time zone 'UTC') - interval '7 days' + interval '9 hours 25 minutes') at time zone 'UTC',
   25, 'completed', null, 25),
  ('57000000-0000-0000-0000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '27000000-0000-0000-0000-000000000001'::uuid,
   (date_trunc('week', now() at time zone 'UTC') - interval '7 days' + interval '10 hours') at time zone 'UTC',
   (date_trunc('week', now() at time zone 'UTC') - interval '7 days' + interval '10 hours 20 minutes') at time zone 'UTC',
   25, 'completed', null, 20),
  ('57000000-0000-0000-0000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '27000000-0000-0000-0000-000000000001'::uuid,
   (date_trunc('week', now() at time zone 'UTC') - interval '7 days' + interval '11 hours') at time zone 'UTC',
   (date_trunc('week', now() at time zone 'UTC') - interval '7 days' + interval '11 hours 5 minutes') at time zone 'UTC',
   25, 'abandoned', 'energy', 5),
  ('57000000-0000-0000-0000-000000000004'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '27000000-0000-0000-0000-000000000001'::uuid,
   (date_trunc('week', now() at time zone 'UTC') - interval '6 days' + interval '9 hours') at time zone 'UTC',
   (date_trunc('week', now() at time zone 'UTC') - interval '6 days' + interval '9 hours 7 minutes') at time zone 'UTC',
   25, 'abandoned', 'interruption', 7),
  ('57000000-0000-0000-0000-000000000005'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '27000000-0000-0000-0000-000000000002'::uuid,
   (date_trunc('week', now() at time zone 'UTC') - interval '6 days' + interval '10 hours') at time zone 'UTC',
   (date_trunc('week', now() at time zone 'UTC') - interval '6 days' + interval '10 hours 8 minutes') at time zone 'UTC',
   25, 'abandoned', 'energy', 8),
  ('57000000-0000-0000-0000-000000000006'::uuid,
   '00000000-0000-0000-0000-000000000002'::uuid,
   '27000000-0000-0000-0000-000000000003'::uuid,
   (date_trunc('week', now() at time zone 'UTC') - interval '7 days' + interval '12 hours') at time zone 'UTC',
   (date_trunc('week', now() at time zone 'UTC') - interval '7 days' + interval '13 hours') at time zone 'UTC',
   25, 'completed', null, 60);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select is((select honest_minutes from public.identity_role_hours where identity_role = 'Builder'), 57, 'identity role sums honest minutes');
select is((select earned_blocks from public.identity_role_hours where identity_role = 'Builder'), 2, 'identity role sums earned blocks');
select is((select honest_minutes from public.identity_role_hours where identity_role = 'Learner'), 8, 'identity roles remain separate');
select is((select earned_blocks from public.identity_role_hours where identity_role = 'Learner'), 0, 'abandoned work earns no blocks');

select is((select abandoned_sessions from public.distraction_breakdown where distraction_tag = 'energy'), 2::bigint, 'distraction breakdown counts abandoned sessions');
select is((select honest_minutes_lost from public.distraction_breakdown where distraction_tag = 'energy'), 13, 'distraction breakdown sums honest minutes lost');
select is((select abandoned_sessions from public.distraction_breakdown where distraction_tag = 'interruption'), 1::bigint, 'distraction tags remain separate');
select is((select honest_minutes_lost from public.distraction_breakdown where distraction_tag = 'interruption'), 7, 'interruption minutes are exact');

select is((select closed_days from public.weekly_review), 2::bigint, 'weekly review counts closed days');
select is((select met_days from public.weekly_review), 1::bigint, 'weekly review counts met days');
select is((select earned_blocks from public.weekly_review), 2, 'weekly review counts achievement blocks');
select is((select honest_minutes from public.weekly_review), 65, 'weekly review sums honest duration');
select is((select completed_sessions from public.weekly_review), 2::bigint, 'weekly review counts completed sessions');
select is((select abandoned_sessions from public.weekly_review), 3::bigint, 'weekly review counts abandoned sessions');
select is((select top_distraction_tag from public.weekly_review), 'energy', 'weekly review selects the modal distraction');
select is((select estimated_blocks from public.weekly_review), 3, 'weekly review sums estimates for tasks completed that week');
select is((select actual_blocks from public.weekly_review), 2, 'weekly review sums actual earned blocks for completed tasks');

select is((select days_with from public.ritual_correlations where signal = 'morning_commit'), 1, 'morning correlation counts committed days');
select is((select days_without from public.ritual_correlations where signal = 'morning_commit'), 59, 'morning correlation includes all other days in the 60-day window');
select is((select avg_blocks_with from public.ritual_correlations where signal = 'morning_commit'), 2.0000::numeric, 'morning correlation averages earned blocks on adherent days');
select is((select avg_blocks_without from public.ritual_correlations where signal = 'morning_commit'), 0.0000::numeric, 'morning correlation has a zero-safe baseline');
select is((select lift from public.ritual_correlations where signal = 'morning_commit'), 2.0000::numeric, 'morning lift is with minus without');

select is((select days_with from public.ritual_correlations where signal = 'evening_close'), 2, 'evening correlation counts closed days');
select is((select days_without from public.ritual_correlations where signal = 'evening_close'), 58, 'evening correlation includes non-closed days');
select is((select avg_blocks_with from public.ritual_correlations where signal = 'evening_close'), 1.0000::numeric, 'evening correlation averages earned blocks on closed days');
select is((select avg_blocks_without from public.ritual_correlations where signal = 'evening_close'), 0.0000::numeric, 'evening correlation has a zero-safe baseline');
select is((select lift from public.ritual_correlations where signal = 'evening_close'), 1.0000::numeric, 'evening lift is with minus without');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select ok(not exists (select 1 from public.identity_role_hours where user_id = '00000000-0000-0000-0000-000000000001'), 'identity role view hides user A from user B');
select ok(not exists (select 1 from public.distraction_breakdown where user_id = '00000000-0000-0000-0000-000000000001'), 'distraction view hides user A from user B');
select ok(not exists (select 1 from public.weekly_review where user_id = '00000000-0000-0000-0000-000000000001'), 'weekly review hides user A from user B');
select ok(not exists (select 1 from public.ritual_correlations where user_id = '00000000-0000-0000-0000-000000000001'), 'ritual correlations hide user A from user B');

reset role;
select is(has_table_privilege('anon', 'public.identity_role_hours', 'select'), false, 'anon cannot select identity role hours');
select is(has_table_privilege('anon', 'public.distraction_breakdown', 'select'), false, 'anon cannot select distraction breakdown');
select is(has_table_privilege('anon', 'public.weekly_review', 'select'), false, 'anon cannot select weekly review');
select is(has_table_privilege('anon', 'public.ritual_correlations', 'select'), false, 'anon cannot select ritual correlations');

-- Daily activity fixtures are added only after the other insight assertions so
-- their current-week values cannot change the weekly and correlation fixtures.
insert into public.sessions (
  id, owner_id, task_id, started_at, ended_at, planned_minutes,
  outcome, distraction_tag, honest_minutes
)
values
  ('57000000-0000-0000-0000-000000000011'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '27000000-0000-0000-0000-000000000001'::uuid,
   (((now() at time zone 'UTC')::date)::timestamp - interval '1 minute') at time zone 'UTC',
   (((now() at time zone 'UTC')::date)::timestamp) at time zone 'UTC',
   25, 'completed', null, 99),
  ('57000000-0000-0000-0000-000000000012'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '27000000-0000-0000-0000-000000000001'::uuid,
   (((now() at time zone 'UTC')::date)::timestamp + interval '5 minutes') at time zone 'UTC',
   (((now() at time zone 'UTC')::date)::timestamp + interval '30 minutes') at time zone 'UTC',
   25, 'completed', null, 25),
  ('57000000-0000-0000-0000-000000000013'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '27000000-0000-0000-0000-000000000001'::uuid,
   (((now() at time zone 'UTC')::date)::timestamp + interval '12 hours') at time zone 'UTC',
   (((now() at time zone 'UTC')::date)::timestamp + interval '12 hours 7 minutes') at time zone 'UTC',
   25, 'abandoned', 'energy', 7),
  ('57000000-0000-0000-0000-000000000014'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   '27000000-0000-0000-0000-000000000001'::uuid,
   ((((now() at time zone 'UTC')::date + 1)::timestamp) + interval '1 minute') at time zone 'UTC',
   ((((now() at time zone 'UTC')::date + 1)::timestamp) + interval '26 minutes') at time zone 'UTC',
   25, 'completed', null, 99);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select is((select count(*) from public.daily_activity), 1::bigint, 'daily activity returns exactly one current-day row');
select is((select activity_date from public.daily_activity), (now() at time zone 'UTC')::date, 'daily activity uses the current UTC date');
select is((select earned_blocks from public.daily_activity), 1, 'daily activity counts only completed sessions as earned blocks');
select is((select honest_minutes from public.daily_activity), 32, 'daily activity sums completed and abandoned duration inside UTC boundaries');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.daily_activity), 1::bigint, 'daily activity keeps one row when the user has no sessions today');
select is((select activity_date from public.daily_activity), (now() at time zone 'UTC')::date, 'empty daily activity still reports the current UTC date');
select is((select earned_blocks from public.daily_activity), 0, 'empty daily activity has zero earned blocks');
select is((select honest_minutes from public.daily_activity), 0, 'empty daily activity has zero honest minutes');
select ok(not exists (select 1 from public.daily_activity where user_id = '00000000-0000-0000-0000-000000000001'::uuid), 'daily activity hides user A from user B');

reset role;
select is(has_table_privilege('anon', 'public.daily_activity', 'select'), false, 'anon cannot select daily activity');

select * from finish();
rollback;
