import { describe, expect, it } from 'bun:test';
import { session } from '../test-helpers';
import { formatCountdown, remainingSecondsAt, timerStateFromSession } from './countdown';

describe('formatCountdown', () => {
  it('renders MM:SS with zero padding', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(9)).toBe('00:09');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(1500)).toBe('25:00');
  });

  it('clamps negatives to zero and floors fractions', () => {
    expect(formatCountdown(-5)).toBe('00:00');
    expect(formatCountdown(59.9)).toBe('00:59');
  });

  it('lets minutes exceed two digits rather than lying', () => {
    expect(formatCountdown(6000)).toBe('100:00');
  });
});

describe('timerStateFromSession', () => {
  const serverNow = Date.parse('2026-07-10T06:05:00.000Z');

  it('anchors a running session so elapsed matches the server', () => {
    const state = timerStateFromSession(session({ elapsedSeconds: 300 }), serverNow);
    expect(state.status).toBe('running');
    expect(state.startedAt).toBe(serverNow - 300_000);
    expect(state.durations?.workMinutes).toBe(25);
  });

  it('freezes a paused session at its accumulated elapsed time', () => {
    const state = timerStateFromSession(
      session({ status: 'paused', elapsedSeconds: 120 }),
      serverNow,
    );
    expect(state.status).toBe('paused');
    expect(state.startedAt).toBeNull();
    expect(state.elapsedMs).toBe(120_000);
  });
});

describe('remainingSecondsAt', () => {
  const serverNow = Date.parse('2026-07-10T06:05:00.000Z');

  it('counts down as local time advances for a running session', () => {
    const active = session({ elapsedSeconds: 300 });
    expect(remainingSecondsAt(active, serverNow, serverNow)).toBe(1200);
    expect(remainingSecondsAt(active, serverNow, serverNow + 10_000)).toBe(1190);
  });

  it('never goes below zero', () => {
    const active = session({ elapsedSeconds: 1500 });
    expect(remainingSecondsAt(active, serverNow, serverNow + 60_000)).toBe(0);
  });

  it('holds steady for a paused session regardless of local time', () => {
    const paused = session({ status: 'paused', elapsedSeconds: 600 });
    expect(remainingSecondsAt(paused, serverNow, serverNow + 120_000)).toBe(900);
  });
});
