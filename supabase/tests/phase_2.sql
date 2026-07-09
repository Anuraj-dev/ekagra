begin;

select plan(18);

select has_table('public', 'devices', 'device registry exists');
select has_column('public', 'sessions', 'running_since', 'sessions persist the current running segment');
select has_column('public', 'sessions', 'paused_at', 'sessions persist pause state');
select has_column('public', 'sessions', 'active_milliseconds', 'sessions persist accumulated focus time');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$insert into public.sessions (
      id, owner_id, task_id, started_at, running_since, planned_minutes, active_milliseconds
    ) values (
      '50000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      now() - interval '5 minutes',
      now() - interval '5 minutes',
      25,
      300000
    )$$,
  '42501',
  null,
  'authenticated clients cannot write sessions directly'
);
reset role;
select lives_ok(
  $$insert into public.sessions (
      id, owner_id, task_id, started_at, running_since, planned_minutes, active_milliseconds
    ) values (
      '50000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      now() - interval '5 minutes',
      now() - interval '5 minutes',
      25,
      300000
    )$$,
  'service role can create an active session row'
);
select is(
  (select active_milliseconds from public.sessions where id = '50000000-0000-0000-0000-000000000001'),
  300000::bigint,
  'active focus time is retained on insert'
);

update public.sessions
set paused_at = now(), running_since = null, active_milliseconds = active_milliseconds + 120000
where id = '50000000-0000-0000-0000-000000000001';
select is(
  (select paused_at is not null and running_since is null from public.sessions where id = '50000000-0000-0000-0000-000000000001'),
  true,
  'paused sessions cannot have a running segment'
);
select is(
  (select active_milliseconds from public.sessions where id = '50000000-0000-0000-0000-000000000001'),
  420000::bigint,
  'pause preserves accumulated milliseconds'
);

update public.sessions
set ended_at = now(), outcome = 'completed', honest_minutes = 7,
    paused_at = null, running_since = null
where id = '50000000-0000-0000-0000-000000000001';
select is(
  (select earned_block from public.sessions where id = '50000000-0000-0000-0000-000000000001'),
  true,
  'completed sessions earn one block'
);
select is(
  (select count(*) from public.sessions where owner_id = '00000000-0000-0000-0000-000000000001' and ended_at is null),
  0::bigint,
  'completed session is no longer active'
);

select lives_ok(
  $$select public.apply_forgiveness_token('phase 2 test')$$,
  'owner can apply the weekly forgiveness token'
);
select is(
  (select used_at is not null from public.forgiveness_tokens
   where owner_id = '00000000-0000-0000-0000-000000000001'
     and week_start = date_trunc('week', current_date)::date),
  true,
  'forgiveness application is recorded'
);
select throws_ok(
  $$select public.apply_forgiveness_token('second use')$$,
  '23514',
  null,
  'weekly forgiveness token cannot be used twice'
);

set local role authenticated;
select throws_ok(
  $$insert into public.devices (id, owner_id, label, token_hash)
    values ('60000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001', 'Desk', repeat('a', 64))$$,
  '42501',
  null,
  'authenticated clients cannot write device tokens directly'
);
reset role;
select lives_ok(
  $$insert into public.devices (id, owner_id, label, token_hash)
    values ('60000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001', 'Desk', repeat('a', 64))$$,
  'owner can register a device token hash'
);
select is(
  (select count(*) from public.devices where owner_id = '00000000-0000-0000-0000-000000000001'),
  1::bigint,
  'device belongs to its registering owner'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*) from public.devices where owner_id = '00000000-0000-0000-0000-000000000001'),
  0::bigint,
  'another user cannot read a device registry row'
);

select * from finish();
rollback;
