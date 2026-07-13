import { describe, expect, test } from 'bun:test';
import { createDevicePollHandler, createSessionHandlers } from './handlers.ts';
import { ApiError } from './http.ts';
import type { SessionRepository, SessionRow, TaskRow } from './types.ts';

const ownerId = '00000000-0000-0000-0000-000000000001';
const taskId = '20000000-0000-0000-0000-000000000001';

const task: TaskRow = {
  id: taskId,
  owner_id: ownerId,
  title: 'Write API contract',
  status: 'planned',
  goal_id: null,
  estimated_blocks: 1,
  priority: null,
  scheduled_for: null,
  scheduled_time: null,
  deadline: null,
  notes: null,
  client_op_id: null,
  completed_at: null,
  created_at: '2026-07-10T08:00:00.000Z',
  updated_at: '2026-07-10T08:00:00.000Z',
};

function repository(): SessionRepository & { active: SessionRow | null } {
  let sequence = 0;
  const fake = {
    active: null as SessionRow | null,
    async getTask(_owner: string, id: string) {
      return id === taskId ? task : null;
    },
    async getActiveSession() {
      return fake.active;
    },
    async getSessionByClientOpId(_owner: string, clientOpId: string) {
      return fake.active?.client_op_id === clientOpId ? fake.active : null;
    },
    async insertSession(input: {
      ownerId: string;
      taskId: string;
      clientOpId: string | null;
      plannedMinutes: number;
      startedAt: string;
    }) {
      if (fake.active) {
        throw new ApiError('conflict', 'That record already exists.', {
          databaseCode: '23505',
        });
      }
      fake.active = {
        id: `session-${++sequence}`,
        owner_id: input.ownerId,
        task_id: input.taskId,
        client_op_id: input.clientOpId,
        started_at: input.startedAt,
        running_since: input.startedAt,
        paused_at: null,
        ended_at: null,
        planned_minutes: input.plannedMinutes,
        outcome: null,
        distraction_tag: null,
        honest_minutes: 0,
        earned_block: false,
        active_milliseconds: 0,
        task,
      };
      return fake.active;
    },
    async updateSession(
      _owner: string,
      id: string,
      patch: Parameters<SessionRepository['updateSession']>[2],
    ) {
      if (!fake.active || fake.active.id !== id) throw new Error('missing active session');
      fake.active = {
        ...fake.active,
        ...patch,
        earned_block: patch.outcome === 'completed' ? true : fake.active.earned_block,
      };
      return fake.active;
    },
    async ensureDayRecord() {},
    async getDevicePollAggregates() {
      return {
        todayBlocks: fake.active?.earned_block ? 1 : 0,
        weeklyMinutes: fake.active?.honest_minutes ?? 0,
      };
    },
    async getNextPlannedTask() {
      return task;
    },
  } satisfies SessionRepository & { active: SessionRow | null };
  return fake;
}

describe('session API handlers', () => {
  test('enforces ownership, planned status, and one active session', async () => {
    const repo = repository();
    const handlers = createSessionHandlers(repo);

    await expect(
      handlers.start({ ownerId, now: 0 }, { taskId: '30000000-0000-0000-0000-000000000001' }),
    ).rejects.toMatchObject({ code: 'not_found' });

    await handlers.start({ ownerId, now: 0 }, { taskId });
    await expect(handlers.start({ ownerId, now: 1 }, { taskId })).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  test('stores the client operation id and recovers an idempotent start replay', async () => {
    const repo = repository();
    const handlers = createSessionHandlers(repo);
    const clientOpId = '60000000-0000-0000-0000-000000000001';

    const first = await handlers.start({ ownerId, now: 0 }, { taskId, clientOpId });
    const replay = await handlers.start({ ownerId, now: 1_000 }, { taskId, clientOpId });

    expect(first).toMatchObject({ created: true, session: { id: 'session-1' } });
    expect(replay).toMatchObject({ created: false, session: { id: 'session-1' } });
    expect(repo.active?.client_op_id).toBe(clientOpId);
    expect(replay.session).not.toHaveProperty('clientOpId');
    expect(replay.session).not.toHaveProperty('client_op_id');
  });

  test('keeps a different-operation active-session conflict as a real conflict', async () => {
    const repo = repository();
    const handlers = createSessionHandlers(repo);

    await handlers.start(
      { ownerId, now: 0 },
      { taskId, clientOpId: '60000000-0000-0000-0000-000000000001' },
    );
    await expect(
      handlers.start(
        { ownerId, now: 1_000 },
        { taskId, clientOpId: '60000000-0000-0000-0000-000000000002' },
      ),
    ).rejects.toMatchObject({
      code: 'conflict',
      message: 'Finish or pause the active session before starting another.',
    });
  });

  test('persists pause/resume and uses core accounting for completion', async () => {
    const repo = repository();
    const handlers = createSessionHandlers(repo);
    await handlers.start({ ownerId, now: 0 }, { taskId });

    const paused = await handlers.command({ ownerId, now: 5 * 60_000 }, { action: 'pause' });
    expect(paused).toMatchObject({ status: 'paused', elapsedSeconds: 300, honestMinutes: 5 });

    await handlers.command({ ownerId, now: 10 * 60_000 }, { action: 'resume' });
    const completed = await handlers.command({ ownerId, now: 30 * 60_000 }, { action: 'complete' });
    expect(completed).toMatchObject({
      status: 'completed',
      honestMinutes: 25,
      earnedBlock: true,
      remainingSeconds: 0,
    });
  });

  test('abandonment records honest minutes but no earned block', async () => {
    const repo = repository();
    const handlers = createSessionHandlers(repo);
    await handlers.start({ ownerId, now: 0 }, { taskId });
    const result = await handlers.command(
      { ownerId, now: 12 * 60_000 + 30_000 },
      { action: 'abandon', distractionTag: 'energy' },
    );
    expect(result).toMatchObject({ status: 'abandoned', honestMinutes: 12, earnedBlock: false });
  });

  test('done early persists a completed session with honest minutes', async () => {
    const repo = repository();
    const handlers = createSessionHandlers(repo);
    await handlers.start({ ownerId, now: 0 }, { taskId });
    const result = await handlers.command(
      { ownerId, now: 12 * 60_000 + 30_000 },
      { action: 'completeEarly' },
    );
    expect(result).toMatchObject({
      status: 'completed',
      honestMinutes: 12,
      earnedBlock: true,
      distractionTag: null,
    });
  });
});

describe('device poll handler', () => {
  test('returns the compact fixed payload and truncates the LCD task line', async () => {
    const repo = repository();
    repo.active = {
      ...(await repo.insertSession({
        ownerId,
        taskId,
        clientOpId: null,
        plannedMinutes: 25,
        startedAt: new Date(0).toISOString(),
      })),
      task: { title: 'A task title longer than sixteen chars' },
    };
    const payload = await createDevicePollHandler(repo)({ ownerId, now: 60_000 });
    expect(payload).toEqual({
      t: 'A task title lon',
      c: '24:00',
      p: 'work',
      b: 0,
      w: 0,
      n: '1970-01-01T00:01:00.000Z',
    });
  });
});
