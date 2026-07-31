import type {
  CurrentSessionResponse,
  Session,
  SessionResponse,
  Task,
  TodayPlan,
} from '@ekagra/core';
import type { ApiClient, RollingRate, TodayStats, WeeklyStanding } from './api/client';
import type { IO } from './io';

/** Scripted IO fake: captures output, replays queued answers to prompts. */
export type FakeIO = IO & {
  output: string[];
  errors: string[];
  answers: string[];
  /** Everything written, joined — convenient for substring assertions. */
  text(): string;
};

export function fakeIO(answers: string[] = [], options: { isTty?: boolean } = {}): FakeIO {
  const output: string[] = [];
  const errors: string[] = [];
  const queue = [...answers];
  return {
    output,
    errors,
    answers: queue,
    isTty: options.isTty ?? false,
    write: (text) => {
      output.push(text);
    },
    line: (text = '') => {
      output.push(`${text}\n`);
    },
    error: (text) => {
      errors.push(text);
    },
    ask: (question) => {
      output.push(question);
      return Promise.resolve(queue.shift() ?? '');
    },
    askSecret: (question) => {
      output.push(question);
      return Promise.resolve(queue.shift() ?? '');
    },
    text: () => [...output, ...errors].join(''),
  };
}

export function task(overrides: Partial<Task> = {}): Task {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Write the CLI',
    status: 'inbox',
    goalId: null,
    estimatedBlocks: null,
    completedAt: null,
    createdAt: '2026-07-10T05:00:00.000Z',
    updatedAt: '2026-07-10T05:00:00.000Z',
    ...overrides,
  };
}

export function session(overrides: Partial<Session> = {}): Session {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    taskId: task().id,
    taskTitle: 'Write the CLI',
    plannedMinutes: 25,
    startedAt: '2026-07-10T06:00:00.000Z',
    pausedAt: null,
    endedAt: null,
    status: 'running',
    elapsedSeconds: 0,
    remainingSeconds: 1500,
    honestMinutes: 0,
    earnedBlock: false,
    distractionTag: null,
    ...overrides,
  };
}

type FakeClientState = {
  tasks?: Task[];
  current?: CurrentSessionResponse;
  startResult?: SessionResponse;
  commandResults?: SessionResponse[];
  todayStats?: TodayStats;
  todayPlan?: TodayPlan;
  rollingRate?: RollingRate | null;
  standings?: WeeklyStanding[];
  userId?: string;
};

/** Recording fake of the injected ApiClient. `calls` logs every method + payload. */
export type FakeClient = ApiClient & { calls: Array<{ method: string; args: unknown[] }> };

export function fakeClient(state: FakeClientState = {}): FakeClient {
  const calls: FakeClient['calls'] = [];
  const record = (method: string, ...args: unknown[]) => calls.push({ method, args });
  const commandQueue = [...(state.commandResults ?? [])];
  const serverNow = '2026-07-10T06:00:00.000Z';

  return {
    calls,
    listTasks: (status) => {
      record('listTasks', status);
      const all = state.tasks ?? [];
      return Promise.resolve(status ? all.filter((t) => t.status === status) : all);
    },
    createTask: (input) => {
      record('createTask', input);
      return Promise.resolve(task({ title: input.title }));
    },
    updateTask: (id, input) => {
      record('updateTask', id, input);
      return Promise.resolve(task({ id }));
    },
    commitMorning: (taskIds) => {
      record('commitMorning', taskIds);
      return Promise.resolve();
    },
    todayPlan: () => {
      record('todayPlan');
      return Promise.resolve(
        state.todayPlan ?? {
          plan: {
            id: '30000000-0000-0000-0000-000000000001',
            horizon: 'day',
            startsOn: '2026-07-31',
            parentPlanId: '30000000-0000-0000-0000-000000000002',
          },
          commitments: (state.tasks ?? [])
            .filter((item) => item.status === 'planned')
            .map((item, index) => ({
              id: `40000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
              subjectType: 'task' as const,
              subjectId: item.id,
              createdAt: item.createdAt,
              task: item,
            })),
        },
      );
    },
    currentSession: () => {
      record('currentSession');
      return Promise.resolve(state.current ?? { session: null, serverNow });
    },
    startSession: (input) => {
      record('startSession', input);
      return Promise.resolve(state.startResult ?? { session: session(), serverNow });
    },
    sessionCommand: (command) => {
      record('sessionCommand', command);
      const next = commandQueue.shift();
      return Promise.resolve(next ?? { session: session({ status: 'completed' }), serverNow });
    },
    todayStats: () => {
      record('todayStats');
      return Promise.resolve(state.todayStats ?? { earnedBlocks: 0, honestMinutes: 0 });
    },
    rollingRate: (windowDays) => {
      record('rollingRate', windowDays);
      return Promise.resolve(state.rollingRate ?? null);
    },
    weeklyStandings: () => {
      record('weeklyStandings');
      return Promise.resolve(state.standings ?? []);
    },
    userId: () => {
      record('userId');
      return Promise.resolve(state.userId ?? 'user-1');
    },
  };
}
