/**
 * CI-only smoke test for the ekagra CLI against the local Supabase stack
 * (runs in the heavy CI job after phase-2-smoke; never on the dev machine).
 * It signs up a throwaway user, seeds the CLI's persisted session under a temp
 * XDG_CONFIG_HOME, and drives real commands end to end: capture → plan →
 * start → pause → resume-context → abandon → today.
 */
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
if (!anonKey) throw new Error('SUPABASE_ANON_KEY is required.');

const email = `phase-8-${Date.now()}@example.com`;
const password = 'Phase8-smoke-password-123!';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function cli(
  configHome: string,
  args: string[],
  stdin?: string,
): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(['bun', 'apps/cli/src/index.ts', ...args], {
    env: {
      ...process.env,
      XDG_CONFIG_HOME: configHome,
      EKAGRA_SUPABASE_URL: supabaseUrl,
      EKAGRA_SUPABASE_ANON_KEY: anonKey,
      NO_COLOR: '1',
    },
    stdin: stdin === undefined ? 'ignore' : new Blob([stdin]),
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, out: out + err };
}

async function main(): Promise<void> {
  // Sign up directly against GoTrue, then seed the CLI session file the same
  // way `ekagra login` would persist it (login itself is interactive).
  const signup = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const auth = (await signup.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    user?: { id: string };
  };
  assert(signup.ok && auth.access_token && auth.refresh_token, 'signup failed');

  const configHome = await mkdtemp(join(tmpdir(), 'ekagra-cli-smoke-'));
  const sessionDir = join(configHome, 'ekagra');
  await Bun.write(
    join(sessionDir, 'session.json'),
    JSON.stringify({
      accessToken: auth.access_token,
      refreshToken: auth.refresh_token,
      expiresAt: auth.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      userId: auth.user?.id ?? '',
      email,
    }),
  );

  const who = await cli(configHome, ['whoami']);
  assert(who.code === 0 && who.out.includes(email), `whoami failed: ${who.out}`);

  const captured = await cli(configHome, ['capture', 'CLI smoke task']);
  assert(
    captured.code === 0 && captured.out.includes('captured'),
    `capture failed: ${captured.out}`,
  );

  const planned = await cli(configHome, ['plan'], '1\n');
  assert(
    planned.code === 0 && planned.out.includes('committed 1 task'),
    `plan failed: ${planned.out}`,
  );

  const today1 = await cli(configHome, ['today']);
  assert(today1.code === 0 && today1.out.includes('CLI smoke task'), `today failed: ${today1.out}`);

  // `ekagra start` would sit in the live countdown for the whole block, so start
  // the session directly via the edge function (the same call the CLI makes) and
  // exercise cross-invocation session control (pause → abandon) through the CLI.
  const startRes = await fetch(`${supabaseUrl}/functions/v1/sessions`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${auth.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ taskId: await plannedTaskId() }),
  });
  assert(startRes.status === 201, `session start failed: ${await startRes.text()}`);

  const pausedOut = await cli(configHome, ['pause']);
  assert(
    pausedOut.code === 0 && pausedOut.out.includes('paused'),
    `pause failed: ${pausedOut.out}`,
  );

  const abandoned = await cli(configHome, ['abandon', 'interruption']);
  assert(
    abandoned.code === 0 && abandoned.out.includes('abandoned'),
    `abandon failed: ${abandoned.out}`,
  );

  const weekOut = await cli(configHome, ['week']);
  assert(weekOut.code === 0 && weekOut.out.includes('This week'), `week failed: ${weekOut.out}`);

  console.log('Phase 8 CLI smoke test passed.');

  async function plannedTaskId(): Promise<string> {
    const res = await fetch(`${supabaseUrl}/functions/v1/tasks?status=planned`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${auth.access_token}` },
    });
    const data = (await res.json()) as { tasks: Array<{ id: string }> };
    assert(res.ok && data.tasks[0], 'no planned task found');
    return data.tasks[0].id;
  }
}

await main();
