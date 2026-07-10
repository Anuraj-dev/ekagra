import { describe, expect, it } from 'bun:test';
import { remainingMs, type Session } from '@ekagra/core';
import { timerStateFromSession } from './timer';

const base: Session = {
  id: 's-1',
  taskId: 'task-1',
  plannedMinutes: 25,
  startedAt: '2026-07-10T09:00:00.000Z',
  pausedAt: null,
  endedAt: null,
  status: 'running',
  elapsedSeconds: 300,
  remainingSeconds: 1200,
  honestMinutes: 5,
  earnedBlock: false,
  distractionTag: null,
};

describe('timerStateFromSession', () => {
  it('reconstructs a running session so the engine agrees with the server', () => {
    const serverNow = Date.parse('2026-07-10T09:05:00.000Z');
    const state = timerStateFromSession(base, serverNow);
    expect(state.status).toBe('running');
    expect(state.taskId).toBe('task-1');
    // remaining = 25 min - 300 s elapsed = 1200 s
    expect(remainingMs(state, serverNow)).toBe(1200 * 1000);
  });

  it('keeps counting down through the engine as server time advances', () => {
    const serverNow = Date.parse('2026-07-10T09:05:00.000Z');
    const state = timerStateFromSession(base, serverNow);
    expect(remainingMs(state, serverNow + 60_000)).toBe(1140 * 1000);
  });

  it('freezes a paused session', () => {
    const serverNow = Date.parse('2026-07-10T09:05:00.000Z');
    const state = timerStateFromSession({ ...base, status: 'paused' }, serverNow);
    expect(state.status).toBe('paused');
    expect(remainingMs(state, serverNow)).toBe(1200 * 1000);
    // Paused: time passing does not shrink the countdown.
    expect(remainingMs(state, serverNow + 120_000)).toBe(1200 * 1000);
  });

  it('never returns negative remaining time', () => {
    const serverNow = Date.parse('2026-07-10T09:05:00.000Z');
    const state = timerStateFromSession(base, serverNow);
    expect(remainingMs(state, serverNow + 999_999_999)).toBe(0);
  });
});
