import {
  createTimerState,
  DEFAULT_TIMER_DURATIONS,
  remainingMs,
  type Session,
  type TimerState,
} from '@ekagra/core';

/** Formats whole seconds as tabular MM:SS (clamped at zero, minutes may exceed 99). */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Reconstructs a packages/core TimerState from a server Session so the CLI drives its
 * countdown through the real engine (`remainingMs`) rather than a reimplementation.
 * Ported from apps/web/src/lib/timer.ts — `startedAt` is anchored on the server clock
 * so (serverNow - startedAt) === elapsed and local ticks only interpolate.
 */
export function timerStateFromSession(session: Session, serverNowMs: number): TimerState {
  const base = createTimerState({ workMinutes: session.plannedMinutes });
  const elapsedMs = session.elapsedSeconds * 1000;
  const durations = {
    workMinutes: session.plannedMinutes,
    shortBreakMinutes: DEFAULT_TIMER_DURATIONS.shortBreakMinutes,
    longBreakMinutes: DEFAULT_TIMER_DURATIONS.longBreakMinutes,
  };

  if (session.status === 'running') {
    return {
      ...base,
      phase: 'work',
      status: 'running',
      taskId: session.taskId,
      durations,
      startedAt: serverNowMs - elapsedMs,
      elapsedMs: 0,
      sessionStartedAt: serverNowMs - elapsedMs,
      lastObservedAt: serverNowMs,
    };
  }

  return {
    ...base,
    phase: 'work',
    status: 'paused',
    taskId: session.taskId,
    durations,
    startedAt: null,
    elapsedMs,
    sessionStartedAt: serverNowMs - elapsedMs,
    lastObservedAt: serverNowMs,
  };
}

/** Remaining whole seconds for `session` at local wall-clock `nowMs`, via the engine. */
export function remainingSecondsAt(session: Session, serverNowMs: number, nowMs: number): number {
  const state = timerStateFromSession(session, serverNowMs);
  if (session.status !== 'running') return Math.ceil(remainingMs(state, serverNowMs) / 1000);
  return Math.ceil(remainingMs(state, nowMs) / 1000);
}
