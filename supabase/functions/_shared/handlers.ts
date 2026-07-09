import {
  accountSession,
  canStartFocusSession,
  createTimerState,
  elapsedMs,
  remainingMs,
  type Session,
  type TimerState,
  transition,
} from '../_vendor/core/index.ts';
import { ApiError, type ApiFailure } from './http.ts';
import type {
  DevicePollHandler,
  HandlerContext,
  SessionCommandHandler,
  SessionRepository,
  SessionRow,
  StartSessionHandler,
} from './types.ts';

function timestamp(value: string): number {
  const result = Date.parse(value);
  if (!Number.isFinite(result))
    throw new ApiError('internal_error', 'Database returned an invalid time.');
  return result;
}

function timerState(row: SessionRow): TimerState {
  const startedAt = timestamp(row.started_at);
  const runningSince = row.running_since === null ? null : timestamp(row.running_since);
  const pausedAt = row.paused_at === null ? null : timestamp(row.paused_at);
  const state = createTimerState({ workMinutes: row.planned_minutes });
  return {
    ...state,
    phase: 'work',
    status: row.paused_at === null ? 'running' : 'paused',
    taskId: row.task_id,
    durations: { ...state.defaults },
    startedAt: runningSince,
    elapsedMs: row.active_milliseconds,
    sessionStartedAt: startedAt,
    lastObservedAt: pausedAt ?? runningSince ?? startedAt,
  };
}

function sessionView(row: SessionRow, now: number): Session {
  const state = row.ended_at === null ? timerState(row) : null;
  const elapsedMs =
    state === null
      ? row.active_milliseconds
      : state.elapsedMs + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
  const remaining = state === null ? 0 : remainingMs(state, now);
  const status = row.outcome ?? (row.paused_at === null ? 'running' : 'paused');
  return {
    id: row.id,
    taskId: row.task_id,
    ...(row.task?.title === undefined ? {} : { taskTitle: row.task.title }),
    plannedMinutes: row.planned_minutes,
    startedAt: row.started_at,
    pausedAt: row.paused_at,
    endedAt: row.ended_at,
    status,
    elapsedSeconds: Math.floor(Math.max(0, elapsedMs) / 1000),
    remainingSeconds: Math.floor(remaining / 1000),
    honestMinutes:
      row.ended_at === null ? Math.floor(Math.max(0, elapsedMs) / 60_000) : row.honest_minutes,
    earnedBlock: row.earned_block,
    distractionTag: row.distraction_tag,
  };
}

function coreError(error: unknown): never {
  const message = error instanceof Error ? error.message : 'Invalid session transition.';
  if (message.includes('reach zero') || message.includes('Cannot')) {
    throw new ApiError('conflict', message);
  }
  throw new ApiError('bad_request', message);
}

export function createSessionHandlers(repository: SessionRepository): {
  start: StartSessionHandler;
  command: SessionCommandHandler;
  current: (context: HandlerContext) => Promise<Session | null>;
} {
  return {
    current: async ({ ownerId, now }) => {
      const active = await repository.getActiveSession(ownerId);
      return active === null ? null : sessionView(active, now);
    },
    start: async ({ ownerId, now }, input) => {
      if (!canStartFocusSession(input.taskId)) {
        throw new ApiError('bad_request', 'A session requires a task.');
      }
      const task = await repository.getTask(ownerId, input.taskId);
      if (task === null) throw new ApiError('not_found', 'Task not found.');
      if (task.status !== 'planned') {
        throw new ApiError('conflict', 'Only a planned task can start a focus session.');
      }
      if (await repository.getActiveSession(ownerId)) {
        throw new ApiError(
          'conflict',
          'Finish or pause the active session before starting another.',
        );
      }

      const initial = createTimerState();
      let result: ReturnType<typeof transition>;
      try {
        result = transition(
          initial,
          { type: 'start', taskId: task.id, durations: input.durations },
          now,
        );
      } catch (error) {
        return coreError(error);
      }
      const row = await repository.insertSession({
        ownerId,
        taskId: task.id,
        plannedMinutes: result.state.durations?.workMinutes ?? 25,
        startedAt: new Date(now).toISOString(),
      });
      await repository.ensureDayRecord(ownerId);
      return sessionView(row, now);
    },
    command: async ({ ownerId, now }, command) => {
      const active = await repository.getActiveSession(ownerId);
      if (active === null) throw new ApiError('not_found', 'No active session.');
      const state = timerState(active);
      let result: ReturnType<typeof transition>;
      try {
        result = transition(
          state,
          command.action === 'abandon'
            ? { type: 'abandon', tag: command.distractionTag }
            : { type: command.action },
          now,
        );
      } catch (error) {
        return coreError(error);
      }

      if (command.action === 'pause') {
        const row = await repository.updateSession(ownerId, active.id, {
          paused_at: new Date(now).toISOString(),
          running_since: null,
          active_milliseconds: Math.floor(result.state.elapsedMs),
        });
        return sessionView(row, now);
      }
      if (command.action === 'resume') {
        const row = await repository.updateSession(ownerId, active.id, {
          paused_at: null,
          running_since: new Date(now).toISOString(),
        });
        return sessionView(row, now);
      }

      const record = result.session;
      if (record === null)
        throw new ApiError('internal_error', 'Session transition did not emit a record.');
      const accounting = accountSession(record.outcome, record.honestMinutes);
      const row = await repository.updateSession(ownerId, active.id, {
        ended_at: record.endedAt
          ? new Date(record.endedAt).toISOString()
          : new Date(now).toISOString(),
        running_since: null,
        paused_at: null,
        active_milliseconds: Math.floor(elapsedMs(state, now)),
        outcome: record.outcome,
        distraction_tag: record.distractionTag,
        honest_minutes: accounting.honestMinutes,
      });
      await repository.ensureDayRecord(ownerId);
      return sessionView(row, now);
    },
  };
}

export function createDevicePollHandler(repository: SessionRepository): DevicePollHandler {
  return async ({ ownerId, now }) => {
    const active = await repository.getActiveSession(ownerId);
    const aggregates = await repository.getDevicePollAggregates(ownerId);
    if (active === null) {
      return {
        t: null,
        c: '00:00',
        p: 'idle',
        b: aggregates.todayBlocks,
        w: aggregates.weeklyMinutes,
        n: new Date(now).toISOString(),
      };
    }

    const state = timerState(active);
    const seconds = Math.floor(remainingMs(state, now) / 1000);
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const remainder = (seconds % 60).toString().padStart(2, '0');
    return {
      t: active.task?.title?.slice(0, 16) ?? null,
      c: `${minutes}:${remainder}`,
      p: state.phase,
      b: aggregates.todayBlocks,
      w: aggregates.weeklyMinutes,
      n: new Date(now).toISOString(),
    };
  };
}

export type { ApiFailure };
