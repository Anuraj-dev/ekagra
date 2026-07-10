export type SessionOutcome = 'completed' | 'abandoned';

export type DistractionTag = 'distraction' | 'interruption' | 'energy';

export const DISTRACTION_TAGS = [
  'distraction',
  'interruption',
  'energy',
] as const satisfies readonly DistractionTag[];

export type TimerPhase = 'idle' | 'work' | 'short_break' | 'long_break';
export type TimerStatus = 'idle' | 'running' | 'paused';

export type TimerDurations = {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
};

export const DEFAULT_TIMER_DURATIONS: Readonly<TimerDurations> = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

export type TimerState = {
  /** The phase being timed. */
  phase: TimerPhase;
  /** An idle timer has no active period; a paused timer retains its phase. */
  status: TimerStatus;
  /** The task bound to the current work/break cycle, or null while idle. */
  taskId: string | null;
  /** Total completed work blocks represented by this timer state. */
  completedBlocks: number;
  /** Defaults used when a new task does not provide an override. */
  defaults: TimerDurations;
  /** Durations selected for the current task, or null while idle. */
  durations: TimerDurations | null;
  /** Server time at which the current running period began. */
  startedAt: number | null;
  /** Active milliseconds accumulated before startedAt, or all elapsed time when paused. */
  elapsedMs: number;
  /** Server time at which the current work session began. */
  sessionStartedAt: number | null;
  /** Most recent server time accepted by a timer transition. */
  lastObservedAt: number | null;
};

export type TimerConfig = Partial<TimerDurations>;

export type TimerEvent =
  | { type: 'start'; taskId: string; durations?: TimerConfig }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'complete' }
  | { type: 'completeEarly' }
  | { type: 'abandon'; tag: DistractionTag };

export type SessionAccounting = {
  /** Whole minutes of focus time, including abandoned sessions. */
  honestMinutes: number;
  /** True only when the full work period was completed. */
  earnedBlock: boolean;
};

export type SessionRecord = SessionAccounting & {
  taskId: string;
  startedAt: number;
  endedAt: number;
  plannedMinutes: number;
  outcome: SessionOutcome;
  distractionTag: DistractionTag | null;
};

export type TimerTransition = {
  state: TimerState;
  /** A work transition emits one record; pause/resume and break transitions emit null. */
  session: SessionRecord | null;
};

export type TimerErrorCode =
  | 'invalid-time'
  | 'invalid-task'
  | 'invalid-duration'
  | 'invalid-distraction-tag'
  | 'invalid-transition'
  | 'work-not-complete';

export class TimerError extends Error {
  readonly code: TimerErrorCode;

  constructor(code: TimerErrorCode, message: string) {
    super(message);
    this.name = 'TimerError';
    this.code = code;
  }
}

function validateNow(now: number): void {
  if (!Number.isFinite(now) || now < 0) {
    throw new TimerError('invalid-time', 'The server clock must be a finite, non-negative number.');
  }
}

function validateMinutes(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0 || value > 480) {
    throw new TimerError(
      'invalid-duration',
      `${name} must be a whole number of minutes between 1 and 480.`,
    );
  }

  return value;
}

function resolveDurations(config: TimerConfig = {}): TimerDurations {
  const durations = {
    workMinutes: config.workMinutes ?? DEFAULT_TIMER_DURATIONS.workMinutes,
    shortBreakMinutes: config.shortBreakMinutes ?? DEFAULT_TIMER_DURATIONS.shortBreakMinutes,
    longBreakMinutes: config.longBreakMinutes ?? DEFAULT_TIMER_DURATIONS.longBreakMinutes,
  };

  return {
    workMinutes: validateMinutes(durations.workMinutes, 'workMinutes'),
    shortBreakMinutes: validateMinutes(durations.shortBreakMinutes, 'shortBreakMinutes'),
    longBreakMinutes: validateMinutes(durations.longBreakMinutes, 'longBreakMinutes'),
  };
}

function currentDurationMs(state: TimerState): number {
  if (state.phase === 'idle' || state.durations === null) {
    return 0;
  }

  const minutes =
    state.phase === 'work'
      ? state.durations.workMinutes
      : state.phase === 'short_break'
        ? state.durations.shortBreakMinutes
        : state.durations.longBreakMinutes;

  return minutes * 60_000;
}

function validateTaskId(taskId: unknown): asserts taskId is string {
  if (typeof taskId !== 'string' || taskId.trim().length === 0) {
    throw new TimerError('invalid-task', 'A timer cannot start without a non-empty taskId.');
  }
}

function isDistractionTag(tag: unknown): tag is DistractionTag {
  return typeof tag === 'string' && (DISTRACTION_TAGS as readonly string[]).includes(tag);
}

function elapsedAt(state: TimerState, now: number): number {
  validateNow(now);

  const durationMs = currentDurationMs(state);
  const runningMs =
    state.status === 'running' && state.startedAt !== null ? Math.max(0, now - state.startedAt) : 0;

  return Math.min(durationMs, Math.max(0, state.elapsedMs + runningMs));
}

function validateMonotonicNow(state: TimerState, now: number): void {
  if (state.lastObservedAt !== null && now < state.lastObservedAt) {
    throw new TimerError(
      'invalid-time',
      'A timer transition cannot use a server timestamp earlier than the last observed time.',
    );
  }
}

function invalidTransition(state: TimerState, event: TimerEvent): never {
  throw new TimerError(
    'invalid-transition',
    `Cannot ${event.type} while the timer is ${state.status} in the ${state.phase} phase.`,
  );
}

function idleState(state: TimerState): TimerState {
  return {
    ...state,
    phase: 'idle',
    status: 'idle',
    taskId: null,
    durations: null,
    startedAt: null,
    elapsedMs: 0,
    sessionStartedAt: null,
    lastObservedAt: null,
  };
}

/**
 * Creates the JSON-serializable state from which every timer transition starts.
 * `config` changes defaults only; a task can override them in its `start` event.
 */
export function createTimerState(config: TimerConfig = {}): TimerState {
  const defaults = resolveDurations(config);

  return {
    phase: 'idle',
    status: 'idle',
    taskId: null,
    completedBlocks: 0,
    defaults,
    durations: null,
    startedAt: null,
    elapsedMs: 0,
    sessionStartedAt: null,
    lastObservedAt: null,
  };
}

/**
 * Returns elapsed milliseconds for the current work or break period at `now`.
 * The caller supplies server time, so this function never reads a system clock.
 */
export function elapsedMs(state: TimerState, now: number): number {
  return elapsedAt(state, now);
}

/**
 * Returns the non-negative countdown derived from the server start time and duration.
 * A paused timer counts only its accumulated elapsed time.
 */
export function remainingMs(state: TimerState, now: number): number {
  return Math.max(0, currentDurationMs(state) - elapsedAt(state, now));
}

/**
 * Applies one timer command using the supplied server timestamp.
 * The returned state is plain data and can be JSON encoded and restored unchanged.
 */
export function transition(state: TimerState, event: TimerEvent, now: number): TimerTransition {
  validateNow(now);

  if (event.type !== 'start') {
    validateMonotonicNow(state, now);
  }

  if (event.type === 'start') {
    if (state.phase !== 'idle' || state.status !== 'idle') {
      return invalidTransition(state, event);
    }

    validateTaskId(event.taskId);
    const durations = resolveDurations({ ...state.defaults, ...event.durations });

    return {
      state: {
        ...state,
        phase: 'work',
        status: 'running',
        taskId: event.taskId.trim(),
        durations,
        startedAt: now,
        elapsedMs: 0,
        sessionStartedAt: now,
        lastObservedAt: now,
      },
      session: null,
    };
  }

  if (event.type === 'pause') {
    if (state.status !== 'running' || state.phase === 'idle') {
      return invalidTransition(state, event);
    }

    // Pausing at or after expiry records a fully elapsed period. It remains
    // paused so the caller can explicitly complete it and earn its block.
    return {
      state: {
        ...state,
        status: 'paused',
        startedAt: null,
        elapsedMs: elapsedAt(state, now),
        lastObservedAt: now,
      },
      session: null,
    };
  }

  if (event.type === 'resume') {
    if (state.status !== 'paused' || state.phase === 'idle') {
      return invalidTransition(state, event);
    }

    return {
      state: {
        ...state,
        status: 'running',
        startedAt: now,
        lastObservedAt: now,
      },
      session: null,
    };
  }

  if (state.phase === 'work' && event.type === 'abandon') {
    if (!isDistractionTag(event.tag)) {
      throw new TimerError(
        'invalid-distraction-tag',
        'An abandoned session requires exactly one valid distraction tag.',
      );
    }

    const elapsed = elapsedAt(state, now);
    validateTaskId(state.taskId);
    const startedAt = state.sessionStartedAt ?? now;
    const endedAt = Math.max(now, startedAt);
    const plannedMinutes = state.durations?.workMinutes ?? DEFAULT_TIMER_DURATIONS.workMinutes;

    return {
      state: idleState(state),
      session: {
        taskId: state.taskId,
        startedAt,
        endedAt,
        plannedMinutes,
        outcome: 'abandoned',
        distractionTag: event.tag,
        ...accountSession('abandoned', elapsed / 60_000),
      },
    };
  }

  if (event.type === 'complete' || event.type === 'completeEarly') {
    const elapsed = elapsedAt(state, now);
    const periodComplete = elapsed >= currentDurationMs(state);
    // Early completion is a statement about work ("I finished the task"), so
    // it is only valid during a work period — breaks end via `complete`.
    const canComplete =
      state.phase !== 'idle' &&
      (event.type !== 'completeEarly' || state.phase === 'work') &&
      (state.status === 'running' ||
        (state.status === 'paused' && (periodComplete || event.type === 'completeEarly')));

    // A paused period may be completed only after it has reached zero. This
    // makes pause-at-expiry completable without allowing early completion.
    if (!canComplete) {
      return invalidTransition(state, event);
    }

    if (event.type === 'complete' && remainingMs(state, now) > 0) {
      throw new TimerError(
        'work-not-complete',
        'A timer must reach zero before it can be completed.',
      );
    }

    if (state.phase === 'short_break' || state.phase === 'long_break') {
      return {
        state: idleState(state),
        session: null,
      };
    }

    validateTaskId(state.taskId);
    const completedBlocks = state.completedBlocks + 1;
    const nextPhase = completedBlocks % 4 === 0 ? 'long_break' : 'short_break';
    const startedAt = state.sessionStartedAt ?? now;
    const plannedMinutes = state.durations?.workMinutes ?? DEFAULT_TIMER_DURATIONS.workMinutes;

    return {
      state: {
        ...state,
        phase: nextPhase,
        status: 'running',
        completedBlocks,
        startedAt: now,
        elapsedMs: 0,
        sessionStartedAt: null,
        lastObservedAt: now,
      },
      session: {
        taskId: state.taskId,
        startedAt,
        endedAt: Math.max(now, startedAt),
        plannedMinutes,
        outcome: 'completed',
        distractionTag: null,
        ...accountSession('completed', elapsed / 60_000),
      },
    };
  }

  return invalidTransition(state, event);
}

/** The hard-block rule: a focus session always belongs to a task. */
export function canStartFocusSession(taskId: string | null | undefined): taskId is string {
  return typeof taskId === 'string' && taskId.trim().length > 0;
}

/** Shared accounting seam used by every client; the database repeats the invariant. */
export function accountSession(outcome: SessionOutcome, elapsedMinutes: number): SessionAccounting {
  const safeMinutes = Number.isFinite(elapsedMinutes) ? Math.max(0, elapsedMinutes) : 0;

  return {
    honestMinutes: Math.floor(safeMinutes),
    earnedBlock: outcome === 'completed',
  };
}

export * from './api.ts';
