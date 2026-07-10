import {
  createTimerState,
  DEFAULT_TIMER_DURATIONS,
  type Session,
  type TimerState,
} from '@ekagra/core';

/**
 * Reconstructs a packages/core TimerState from a server Session so the UI drives
 * its countdown through the real engine (`remainingMs`/`elapsedMs`) rather than a
 * reimplementation. `serverNowMs` is the parsed `serverNow` from the same response;
 * `startedAt` is expressed on the server clock so the engine's math stays honest.
 *
 * The client renders against a server-skew-adjusted clock (see useServerClock), so
 * all timestamps here live on the server timeline.
 */
export function timerStateFromSession(session: Session, serverNowMs: number): TimerState {
  const base = createTimerState({ workMinutes: session.plannedMinutes });
  const elapsedMs = session.elapsedSeconds * 1000;

  if (session.status === 'running') {
    // Anchor startedAt so that (serverNow - startedAt) == elapsed.
    return {
      ...base,
      phase: 'work',
      status: 'running',
      taskId: session.taskId,
      durations: {
        workMinutes: session.plannedMinutes,
        shortBreakMinutes: DEFAULT_TIMER_DURATIONS.shortBreakMinutes,
        longBreakMinutes: DEFAULT_TIMER_DURATIONS.longBreakMinutes,
      },
      startedAt: serverNowMs - elapsedMs,
      elapsedMs: 0,
      sessionStartedAt: serverNowMs - elapsedMs,
      lastObservedAt: serverNowMs,
    };
  }

  // Paused (or any non-running active state): freeze accumulated elapsed time.
  return {
    ...base,
    phase: 'work',
    status: 'paused',
    taskId: session.taskId,
    durations: {
      workMinutes: session.plannedMinutes,
      shortBreakMinutes: DEFAULT_TIMER_DURATIONS.shortBreakMinutes,
      longBreakMinutes: DEFAULT_TIMER_DURATIONS.longBreakMinutes,
    },
    startedAt: null,
    elapsedMs,
    sessionStartedAt: serverNowMs - elapsedMs,
    lastObservedAt: serverNowMs,
  };
}
