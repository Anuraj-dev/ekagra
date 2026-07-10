import { describe, expect, it } from 'bun:test';
import { fakeClient, fakeIO, session, task } from '../test-helpers';
import { capture } from './capture';
import { parseSelection, plan } from './plan';
import { abandon, done, pause, start } from './session';
import { today } from './today';
import { week } from './week';

describe('capture', () => {
  it('creates a zero-field inbox task from the joined args', async () => {
    const client = fakeClient();
    const io = fakeIO();
    const code = await capture({ client, io }, ['ship', 'the', 'CLI']);
    expect(code).toBe(0);
    expect(client.calls).toEqual([{ method: 'createTask', args: [{ title: 'ship the CLI' }] }]);
    expect(io.text()).toContain('captured: ship the CLI');
  });

  it('rejects an empty title with usage help', async () => {
    const client = fakeClient();
    const io = fakeIO();
    expect(await capture({ client, io }, [])).toBe(1);
    expect(client.calls).toHaveLength(0);
    expect(io.errors[0]).toContain('Usage');
  });
});

describe('parseSelection', () => {
  it('parses spaces and commas, dedupes, keeps order', () => {
    expect(parseSelection('1, 3 2 3')).toEqual([1, 3, 2]);
  });
  it('ignores junk and non-positive numbers', () => {
    expect(parseSelection('a 0 -1 2')).toEqual([2]);
  });
  it('rejects tokens that merely start with digits', () => {
    expect(parseSelection('1foo 1.5 2')).toEqual([2]);
  });
});

describe('plan', () => {
  const inbox = [
    task({ id: '11111111-1111-4111-8111-111111111111', title: 'alpha' }),
    task({ id: '33333333-3333-4333-8333-333333333333', title: 'beta' }),
  ];

  it('commits the selected tasks through the morning-commit RPC', async () => {
    const client = fakeClient({ tasks: inbox });
    const io = fakeIO(['1 2']);
    expect(await plan({ client, io })).toBe(0);
    const commit = client.calls.find((c) => c.method === 'commitMorning');
    expect(commit?.args[0]).toEqual([inbox[0].id, inbox[1].id]);
    expect(io.text()).toContain('committed 2 tasks');
  });

  it('rejects picking more than 3 tasks', async () => {
    const many = [
      ...inbox,
      task({ id: '44444444-4444-4444-8444-444444444444', title: 'gamma' }),
      task({ id: '55555555-5555-4555-8555-555555555555', title: 'delta' }),
    ];
    const client = fakeClient({ tasks: many });
    const io = fakeIO(['1 2 3 4']);
    expect(await plan({ client, io })).toBe(1);
    expect(client.calls.some((c) => c.method === 'commitMorning')).toBe(false);
  });

  it('leaves the plan unchanged when nothing is selected', async () => {
    const client = fakeClient({ tasks: inbox });
    const io = fakeIO(['']);
    expect(await plan({ client, io })).toBe(0);
    expect(client.calls.some((c) => c.method === 'commitMorning')).toBe(false);
    expect(io.text()).toContain('plan unchanged');
  });

  it('says so when the inbox is empty', async () => {
    const client = fakeClient({ tasks: [] });
    const io = fakeIO();
    expect(await plan({ client, io })).toBe(0);
    expect(io.text()).toContain('Inbox is empty');
  });
});

describe('start', () => {
  const planned = task({ status: 'planned', title: 'deep work' });

  it('refuses when a session is already active', async () => {
    const client = fakeClient({
      current: { session: session(), serverNow: '2026-07-10T06:00:00.000Z' },
    });
    const io = fakeIO();
    expect(await start({ client, io }, [])).toBe(1);
    expect(client.calls.some((c) => c.method === 'startSession')).toBe(false);
    expect(io.text()).toContain('already active');
  });

  it('requires a committed plan before starting (hard-block)', async () => {
    const client = fakeClient({ tasks: [] });
    const io = fakeIO();
    expect(await start({ client, io }, [])).toBe(1);
    expect(client.calls.some((c) => c.method === 'startSession')).toBe(false);
    expect(io.text()).toContain('ekagra plan');
  });

  it('starts the sole planned task without prompting', async () => {
    // Start with a session that is already at zero so the live loop completes
    // immediately (first tick auto-completes) without waiting.
    const zero = session({ elapsedSeconds: 1500, status: 'running' });
    const client = fakeClient({
      tasks: [planned],
      startResult: { session: zero, serverNow: '2026-07-10T06:00:00.000Z' },
      commandResults: [
        {
          session: session({ status: 'completed', earnedBlock: true, honestMinutes: 25 }),
          serverNow: '2026-07-10T06:25:00.000Z',
        },
      ],
    });
    const io = fakeIO([], { isTty: true });
    expect(await start({ client, io }, [])).toBe(0);
    const started = client.calls.find((c) => c.method === 'startSession');
    expect(started?.args[0]).toEqual({ taskId: planned.id });
    expect(io.text()).toContain('block earned');
  });

  it('rejects malformed index arguments like "1foo"', async () => {
    const client = fakeClient({ tasks: [planned] });
    const io = fakeIO();
    expect(await start({ client, io }, ['1foo'])).toBe(1);
    expect(client.calls.some((c) => c.method === 'startSession')).toBe(false);
  });

  it('prints one status line and skips the live loop on non-TTY stdout', async () => {
    const client = fakeClient({
      tasks: [planned],
      startResult: {
        session: session({ remainingSeconds: 1500 }),
        serverNow: '2026-07-10T06:00:00.000Z',
      },
    });
    const io = fakeIO([], { isTty: false });
    expect(await start({ client, io }, [])).toBe(0);
    expect(io.text()).toContain('started');
    expect(io.text()).toContain('ekagra today');
    // No countdown loop and no auto-complete were run.
    expect(client.calls.some((c) => c.method === 'sessionCommand')).toBe(false);
  });
});

describe('pause / done / abandon', () => {
  it('pause sends the pause command and reports remaining time', async () => {
    const client = fakeClient({
      commandResults: [
        {
          session: session({ status: 'paused', remainingSeconds: 754 }),
          serverNow: '2026-07-10T06:12:26.000Z',
        },
      ],
    });
    const io = fakeIO();
    expect(await pause({ client, io })).toBe(0);
    expect(client.calls[0]).toEqual({ method: 'sessionCommand', args: [{ action: 'pause' }] });
    expect(io.text()).toContain('12:34');
  });

  it('done sends complete and reports the earned block', async () => {
    const client = fakeClient({
      commandResults: [
        {
          session: session({ status: 'completed', earnedBlock: true, honestMinutes: 25 }),
          serverNow: '2026-07-10T06:25:00.000Z',
        },
      ],
    });
    const io = fakeIO();
    expect(await done({ client, io })).toBe(0);
    expect(client.calls[0]).toEqual({ method: 'sessionCommand', args: [{ action: 'complete' }] });
    expect(io.text()).toContain('block earned');
  });

  it('abandon passes the tag through and keeps honest minutes visible', async () => {
    const client = fakeClient({
      commandResults: [
        {
          session: session({ status: 'abandoned', distractionTag: 'energy', honestMinutes: 11 }),
          serverNow: '2026-07-10T06:11:00.000Z',
        },
      ],
    });
    const io = fakeIO();
    expect(await abandon({ client, io }, ['energy'])).toBe(0);
    expect(client.calls[0]).toEqual({
      method: 'sessionCommand',
      args: [{ action: 'abandon', distractionTag: 'energy' }],
    });
    expect(io.text()).toContain('11 honest minutes kept');
  });

  it('abandon prompts for a tag and rejects invalid answers', async () => {
    const client = fakeClient();
    const io = fakeIO(['nonsense']);
    expect(await abandon({ client, io }, [])).toBe(1);
    expect(client.calls).toHaveLength(0);
  });
});

describe('today', () => {
  it('shows plan, active countdown, tallies, and rolling rate', async () => {
    const client = fakeClient({
      tasks: [task({ status: 'planned', title: 'deep work' })],
      current: {
        session: session({ elapsedSeconds: 300 }),
        serverNow: '2026-07-10T06:05:00.000Z',
      },
      todayStats: { earnedBlocks: 3, honestMinutes: 95 },
      rollingRate: {
        windowDays: 7,
        endedSessions: 10,
        completedSessions: 8,
        honestMinutes: 400,
        earnedBlocks: 8,
        completionRate: 0.8,
      },
    });
    const io = fakeIO();
    expect(await today({ client, io })).toBe(0);
    const text = io.text();
    expect(text).toContain('deep work');
    expect(text).toContain('20:00');
    expect(text).toContain('blocks: 3');
    expect(text).toContain('honest minutes: 95');
    expect(text).toContain('80%');
  });

  it('nudges toward `ekagra plan` when nothing is committed', async () => {
    const client = fakeClient({ tasks: [] });
    const io = fakeIO();
    expect(await today({ client, io })).toBe(0);
    expect(io.text()).toContain('ekagra plan');
    expect(io.text()).toContain('no active session');
  });
});

describe('week', () => {
  it('summarizes the week and marks the signed-in user in the Crew list', async () => {
    const client = fakeClient({
      rollingRate: {
        windowDays: 7,
        endedSessions: 12,
        completedSessions: 9,
        honestMinutes: 510,
        earnedBlocks: 9,
        completionRate: 0.75,
      },
      standings: [
        {
          userId: 'user-1',
          displayName: 'Raja',
          weekStart: '2026-07-06',
          earnedBlocks: 9,
          honestMinutes: 510,
        },
        {
          userId: 'user-2',
          displayName: 'Mira',
          weekStart: '2026-07-06',
          earnedBlocks: 7,
          honestMinutes: 300,
        },
      ],
      userId: 'user-1',
    });
    const io = fakeIO();
    expect(await week({ client, io })).toBe(0);
    const text = io.text();
    expect(text).toContain('earned blocks: 9');
    expect(text).toContain('75%');
    expect(text).toContain('Raja');
    expect(text).toContain('you');
  });
});
