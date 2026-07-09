import { describe, expect, test } from 'bun:test';

import {
  accountSession,
  canStartFocusSession,
  createTimerState,
  elapsedMs,
  remainingMs,
  type TimerState,
  transition,
} from './index';

const minute = 60_000;

function start(state: TimerState, now = 1_000, durations?: Parameters<typeof createTimerState>[0]) {
  return transition(state, { type: 'start', taskId: 'task-1', durations }, now);
}

function completeWork(state: TimerState, now: number) {
  return transition(state, { type: 'complete' }, now);
}

describe('timer state machine', () => {
  test('starts idle only when a non-empty task is supplied', () => {
    const initial = createTimerState();

    expect(start(initial).state).toMatchObject({
      phase: 'work',
      status: 'running',
      taskId: 'task-1',
      startedAt: 1_000,
      sessionStartedAt: 1_000,
      elapsedMs: 0,
    });
    expect(() => transition(initial, { type: 'start', taskId: '   ' }, 1_000)).toThrow(
      'non-empty taskId',
    );
    expect(() => transition(initial, { type: 'start', taskId: null as never }, 1_000)).toThrow(
      'non-empty taskId',
    );
    expect(canStartFocusSession(null)).toBe(false);
    expect(canStartFocusSession(undefined)).toBe(false);
    expect(canStartFocusSession('   ')).toBe(false);
    expect(canStartFocusSession('task-1')).toBe(true);
  });

  test('uses 25/5 defaults and applies per-task duration overrides', () => {
    const initial = createTimerState();
    const defaults = start(initial).state;
    const overridden = start(initial, 2_000, {
      workMinutes: 50,
      shortBreakMinutes: 10,
    }).state;

    expect(defaults.durations).toEqual({
      workMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
    });
    expect(overridden.durations).toEqual({
      workMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 15,
    });
    expect(remainingMs(defaults, 1_000 + 25 * minute)).toBe(0);
    expect(remainingMs(overridden, 2_000 + 50 * minute)).toBe(0);
    expect(() => start(initial, 1_000, { workMinutes: 0 })).toThrow('between 1 and 480');
    expect(() => start(initial, 1_000, { shortBreakMinutes: 1.5 })).toThrow('whole number');
  });

  test('derives the countdown from injected server time and survives JSON resume', () => {
    const running = start(createTimerState(), 10_000).state;

    expect(remainingMs(running, 10_000)).toBe(25 * minute);
    expect(remainingMs(running, 70_000)).toBe(24 * minute);
    expect(elapsedMs(running, 70_000)).toBe(minute);
    expect(remainingMs(running, 9_000)).toBe(25 * minute);

    const resumed = JSON.parse(JSON.stringify(running)) as TimerState;
    expect(remainingMs(resumed, 70_000)).toBe(24 * minute);
    expect(resumed).toEqual(running);
  });

  test('pauses and resumes without counting paused time', () => {
    const running = start(createTimerState(), 1_000).state;
    const paused = transition(running, { type: 'pause' }, 6_000).state;

    expect(paused).toMatchObject({ status: 'paused', startedAt: null, elapsedMs: 5_000 });
    expect(elapsedMs(paused, 5 * minute)).toBe(5_000);

    const resumed = transition(paused, { type: 'resume' }, 100_000).state;
    expect(resumed).toMatchObject({ status: 'running', startedAt: 100_000, elapsedMs: 5_000 });
    expect(elapsedMs(resumed, 105_000)).toBe(10_000);
    expect(remainingMs(resumed, 105_000)).toBe(25 * minute - 10_000);
  });

  test('rejects commands that do not match the current state', () => {
    const initial = createTimerState();
    const running = start(initial).state;

    expect(() => transition(initial, { type: 'pause' }, 1_000)).toThrow('Cannot pause');
    expect(() => transition(running, { type: 'start', taskId: 'other' }, 1_000)).toThrow(
      'Cannot start',
    );
    expect(() => transition(running, { type: 'resume' }, 1_000)).toThrow('Cannot resume');
    expect(() => transition(running, { type: 'complete' }, 1_001)).toThrow('reach zero');
    expect(() => transition(running, { type: 'pause' }, 1_000)).not.toThrow();
  });

  test('completes a work block, earns exactly one block, and enters a short break', () => {
    const running = start(createTimerState(), 1_000).state;
    const result = completeWork(running, 1_000 + 25 * minute);

    expect(result.session).toMatchObject({
      taskId: 'task-1',
      startedAt: 1_000,
      endedAt: 1_000 + 25 * minute,
      plannedMinutes: 25,
      outcome: 'completed',
      distractionTag: null,
      honestMinutes: 25,
      earnedBlock: true,
    });
    expect(result.state).toMatchObject({
      phase: 'short_break',
      status: 'running',
      taskId: 'task-1',
      completedBlocks: 1,
      startedAt: 1_000 + 25 * minute,
      elapsedMs: 0,
      sessionStartedAt: null,
    });
    expect(remainingMs(result.state, 1_000 + 25 * minute)).toBe(5 * minute);
  });

  test('completes a break and returns to idle, preserving the earned-block total', () => {
    const work = start(createTimerState(), 1_000).state;
    const shortBreak = completeWork(work, 1_000 + 25 * minute).state;
    const idle = transition(shortBreak, { type: 'complete' }, 1_000 + 30 * minute);

    expect(idle.session).toBeNull();
    expect(idle.state).toMatchObject({
      phase: 'idle',
      status: 'idle',
      taskId: null,
      completedBlocks: 1,
      durations: null,
      startedAt: null,
      elapsedMs: 0,
      sessionStartedAt: null,
    });
  });

  test('selects a long break after every fourth earned block', () => {
    let state = createTimerState({ workMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 2 });
    let now = 0;

    for (let block = 1; block <= 4; block += 1) {
      state = start(state, now).state;
      const workResult = completeWork(state, now + minute);
      state = workResult.state;
      expect(workResult.session?.earnedBlock).toBe(true);
      expect(state.phase).toBe(block === 4 ? 'long_break' : 'short_break');
      now = now + minute + (block === 4 ? 2 * minute : minute);
      state = transition(state, { type: 'complete' }, now).state;
    }

    expect(state).toMatchObject({ phase: 'idle', completedBlocks: 4 });
  });

  test('abandonment requires exactly one supported tag and never earns a block', () => {
    const tags = ['distraction', 'interruption', 'done-early', 'energy'] as const;

    for (const tag of tags) {
      const running = start(createTimerState(), 1_000).state;
      const result = transition(running, { type: 'abandon', tag }, 12 * minute + 54_000 + 1_000);

      expect(result.session).toMatchObject({
        outcome: 'abandoned',
        distractionTag: tag,
        honestMinutes: 12,
        earnedBlock: false,
      });
      expect(result.state).toMatchObject({ phase: 'idle', status: 'idle', completedBlocks: 0 });
    }

    const running = start(createTimerState()).state;
    expect(() => transition(running, { type: 'abandon', tag: '' as never }, 2_000)).toThrow(
      'exactly one valid distraction tag',
    );
    expect(() =>
      transition(running, { type: 'abandon', tag: 'distraction,energy' as never }, 2_000),
    ).toThrow('exactly one valid distraction tag');
  });

  test('abandoning a paused session accounts only focus time already spent', () => {
    const running = start(createTimerState(), 1_000).state;
    const paused = transition(running, { type: 'pause' }, 10 * minute + 1_000).state;
    const result = transition(paused, { type: 'abandon', tag: 'energy' }, 60 * minute);

    expect(result.session).toMatchObject({ honestMinutes: 10, earnedBlock: false });
    expect(result.state.phase).toBe('idle');
  });

  test('does not complete a paused or unfinished work period', () => {
    const running = start(createTimerState(), 1_000).state;
    const paused = transition(running, { type: 'pause' }, 1_001).state;

    expect(() => transition(paused, { type: 'complete' }, 25 * minute)).toThrow('Cannot complete');
    expect(() => transition(running, { type: 'complete' }, 1_000 + 24 * minute)).toThrow(
      'reach zero',
    );
  });
});

describe('session accounting', () => {
  test('floors honest minutes, clamps negatives, and awards blocks only for completion', () => {
    expect(accountSession('abandoned', 12.9)).toEqual({ honestMinutes: 12, earnedBlock: false });
    expect(accountSession('completed', 25)).toEqual({ honestMinutes: 25, earnedBlock: true });
    expect(accountSession('abandoned', -2)).toEqual({ honestMinutes: 0, earnedBlock: false });
    expect(accountSession('completed', Number.NaN)).toEqual({
      honestMinutes: 0,
      earnedBlock: true,
    });
    expect(accountSession('abandoned', Number.POSITIVE_INFINITY)).toEqual({
      honestMinutes: 0,
      earnedBlock: false,
    });
  });

  test('rejects non-deterministic or invalid clock values', () => {
    const state = createTimerState();

    expect(() => remainingMs(state, Number.NaN)).toThrow('finite');
    expect(() => transition(state, { type: 'start', taskId: 'task-1' }, -1)).toThrow(
      'non-negative',
    );
  });
});
