const baseUrl = process.env.EKAGRA_FUNCTIONS_URL ?? 'http://127.0.0.1:54321/functions/v1';
const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';

if (!anonKey) throw new Error('SUPABASE_ANON_KEY is required.');

const email = `phase-2-${Date.now()}@example.com`;
const password = 'Phase2-smoke-password-123!';

type SmokeData = {
  task?: { id: string };
  session?: { status?: string; earnedBlock?: boolean };
  deviceToken?: string;
  [key: string]: unknown;
};

async function request(
  path: string,
  init: RequestInit = {},
): Promise<{ response: Response; data: SmokeData }> {
  const response = await fetch(`${baseUrl}/${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let data: SmokeData = {};
  try {
    const parsed: unknown = JSON.parse(text);
    data =
      typeof parsed === 'object' && parsed !== null ? (parsed as SmokeData) : { value: parsed };
  } catch {
    data = { text };
  }
  return { response, data };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const signup = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const auth = (await signup.json()) as { access_token?: string };
  assert(signup.ok && auth.access_token, `signup failed: ${JSON.stringify(auth)}`);
  const authorization = { Authorization: `Bearer ${auth.access_token}` };

  const missing = await request('sessions', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ taskId: '20000000-0000-0000-0000-000000000001' }),
  });
  assert(
    missing.response.status === 404,
    `foreign or missing task must be rejected (got ${missing.response.status}: ${JSON.stringify(missing.data)})`,
  );

  const createdTask = await request('tasks', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ title: 'Phase 2 smoke task' }),
  });
  assert(
    createdTask.response.status === 201,
    `task create failed: ${JSON.stringify(createdTask.data)}`,
  );
  assert(createdTask.data.task, 'task create returned no task');
  const taskId = createdTask.data.task.id;

  const commit = await request('rituals?ritual=morning-commit', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ taskIds: [taskId] }),
  });
  assert(commit.response.ok, `morning commit failed: ${JSON.stringify(commit.data)}`);

  const started = await request('sessions', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ taskId, durations: { workMinutes: 1 } }),
  });
  assert(started.response.status === 201, `session start failed: ${JSON.stringify(started.data)}`);

  const registered = await request('devices', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ label: 'CI desk' }),
  });
  assert(
    registered.response.status === 201,
    `device registration failed: ${JSON.stringify(registered.data)}`,
  );
  assert(
    registered.data.deviceToken && registered.data.deviceId,
    'device registration returned no device',
  );
  const originalDeviceToken = registered.data.deviceToken;
  const deviceId = registered.data.deviceId;

  const rotated = await request(`devices?id=${deviceId}&action=rotate`, {
    method: 'POST',
    headers: authorization,
  });
  assert(rotated.response.ok && rotated.data.deviceToken, 'device token rotation failed');
  assert(rotated.data.deviceToken !== originalDeviceToken, 'device token was not rotated');
  const oldToken = await fetch(`${baseUrl}/device-poll`, {
    headers: { apikey: anonKey, 'x-device-token': originalDeviceToken },
  });
  assert(oldToken.status === 401, 'rotated device token must invalidate the old token');
  const deviceHeaders = { 'x-device-token': rotated.data.deviceToken };

  const poll = await fetch(`${baseUrl}/device-poll`, {
    headers: { apikey: anonKey, ...deviceHeaders },
  });
  const payload = (await poll.json()) as Record<string, unknown>;
  assert(poll.ok, `device poll failed: ${JSON.stringify(payload)}`);
  assert(
    ['t', 'c', 'p', 'b', 'w', 'n'].every((key) => key in payload),
    'device payload shape changed',
  );
  assert(
    payload.p === 'work' && payload.c === '01:00',
    'device poll did not reflect the running session',
  );

  const paused = await request('device-action', {
    method: 'POST',
    headers: { apikey: anonKey, ...deviceHeaders },
    body: JSON.stringify({ action: 'pause' }),
  });
  assert(paused.response.ok && paused.data.session?.status === 'paused', 'device pause failed');

  const resumed = await request('sessions', {
    method: 'PATCH',
    headers: authorization,
    body: JSON.stringify({ action: 'resume' }),
  });
  assert(
    resumed.response.ok && resumed.data.session?.status === 'running',
    'session resume failed',
  );

  await new Promise((resolve) => setTimeout(resolve, 61_000));
  const completed = await request('sessions', {
    method: 'PATCH',
    headers: authorization,
    body: JSON.stringify({ action: 'complete' }),
  });
  assert(completed.response.ok, `session completion failed: ${JSON.stringify(completed.data)}`);
  assert(completed.data.session?.earnedBlock === true, 'completed session did not earn a block');

  const invalidDevice = await fetch(`${baseUrl}/device-poll`, {
    headers: { apikey: anonKey, 'x-device-token': 'invalid-device-token' },
  });
  assert(invalidDevice.status === 401, 'invalid device token must return 401');
  const revoked = await request(`devices?id=${deviceId}`, {
    method: 'DELETE',
    headers: authorization,
  });
  assert(revoked.response.status === 204, 'device revoke failed');
  const revokedDevice = await fetch(`${baseUrl}/device-poll`, {
    headers: { apikey: anonKey, ...deviceHeaders },
  });
  assert(revokedDevice.status === 401, 'revoked device token must return 401');
  console.log('Phase 2 Edge Function smoke test passed.');
}

await main();
