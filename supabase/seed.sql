insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed-a@example.com', 'phase-0-seed', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed-b@example.com', 'phase-0-seed', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed-private@example.com', 'phase-0-seed', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name)
values
  ('00000000-0000-0000-0000-000000000001', 'Asha'),
  ('00000000-0000-0000-0000-000000000002', 'Bala'),
  ('00000000-0000-0000-0000-000000000003', 'Private user')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'accepted')
on conflict do nothing;

insert into public.goals (id, owner_id, title, identity_role)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ship the focus loop', 'Builder')
on conflict (id) do nothing;

insert into public.tasks (id, owner_id, title, status, goal_id, estimated_blocks)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Write migration', 'done', '10000000-0000-0000-0000-000000000001', 3),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Review schema', 'done', null, 1),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Private reflection title', 'done', null, 1)
on conflict (id) do nothing;

insert into public.sessions (
  owner_id, task_id, started_at, ended_at, planned_minutes, outcome, distraction_tag, honest_minutes
)
values
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', date_trunc('week', now()) + interval '1 hour', date_trunc('week', now()) + interval '1 hour 25 minutes', 25, 'completed', null, 25),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', date_trunc('week', now()) + interval '2 hours', date_trunc('week', now()) + interval '2 hours 25 minutes', 25, 'completed', null, 25),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', date_trunc('week', now()) + interval '3 hours', date_trunc('week', now()) + interval '3 hours 10 minutes', 25, 'abandoned', 'energy', 10),
  ('00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', date_trunc('week', now()) + interval '4 hours', date_trunc('week', now()) + interval '4 hours 25 minutes', 25, 'completed', null, 25),
  ('00000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', date_trunc('week', now()) + interval '5 hours', date_trunc('week', now()) + interval '5 hours 25 minutes', 25, 'completed', null, 25);

insert into public.day_records (owner_id, record_date, morning_task_ids, plan_match, went_wrong_tag, note)
values (
  '00000000-0000-0000-0000-000000000001', current_date,
  array['20000000-0000-0000-0000-000000000001']::uuid[], true, null, 'Private reflection stays owner-only'
)
on conflict (owner_id, record_date) do nothing;

insert into public.forgiveness_tokens (owner_id, week_start, used_at, reason)
values ('00000000-0000-0000-0000-000000000001', date_trunc('week', current_date)::date, null, 'seed token')
on conflict (owner_id, week_start) do nothing;
