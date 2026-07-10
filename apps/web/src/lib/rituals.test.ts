import { describe, expect, it } from 'bun:test';
import {
  clampTime,
  DEFAULT_CUE_PREFS,
  formatCueTime,
  localDateKey,
  parseCuePrefs,
  parseTimeInput,
  ritualCueState,
  serializeCuePrefs,
  toMinutes,
} from './rituals';

describe('toMinutes / formatCueTime', () => {
  it('converts a cue time to minutes since midnight', () => {
    expect(toMinutes({ hour: 8, minute: 30 })).toBe(510);
    expect(toMinutes({ hour: 0, minute: 0 })).toBe(0);
  });

  it('formats zero-padded HH:MM', () => {
    expect(formatCueTime({ hour: 8, minute: 5 })).toBe('08:05');
    expect(formatCueTime({ hour: 21, minute: 0 })).toBe('21:00');
  });
});

describe('parseTimeInput', () => {
  it('parses a valid HH:MM value', () => {
    expect(parseTimeInput('09:15')).toEqual({ hour: 9, minute: 15 });
  });

  it('rejects malformed or out-of-range values', () => {
    expect(parseTimeInput('9:60')).toBeNull();
    expect(parseTimeInput('24:00')).toBeNull();
    expect(parseTimeInput('nope')).toBeNull();
  });
});

describe('clampTime', () => {
  it('clamps out-of-range and non-finite values', () => {
    expect(clampTime({ hour: 30, minute: 90 })).toEqual({ hour: 23, minute: 59 });
    expect(clampTime({ hour: -1, minute: -5 })).toEqual({ hour: 0, minute: 0 });
    expect(clampTime({ hour: Number.NaN, minute: 12 })).toEqual({ hour: 0, minute: 12 });
  });
});

describe('parseCuePrefs / serializeCuePrefs', () => {
  it('falls back to defaults for null or garbage', () => {
    expect(parseCuePrefs(null)).toEqual(DEFAULT_CUE_PREFS);
    expect(parseCuePrefs('not json')).toEqual(DEFAULT_CUE_PREFS);
  });

  it('round-trips a saved preference', () => {
    const prefs = { morning: { hour: 7, minute: 0 }, evening: { hour: 22, minute: 30 } };
    expect(parseCuePrefs(serializeCuePrefs(prefs))).toEqual(prefs);
  });

  it('sanitises partial or invalid stored values', () => {
    expect(parseCuePrefs(JSON.stringify({ morning: { hour: 99, minute: 5 } }))).toEqual({
      morning: { hour: 23, minute: 5 },
      evening: DEFAULT_CUE_PREFS.evening,
    });
  });
});

describe('ritualCueState', () => {
  const prefs = DEFAULT_CUE_PREFS; // morning 08:30, evening 21:00

  it('shows the morning cue when no plan and past the morning time', () => {
    expect(
      ritualCueState({ nowMinutes: 9 * 60, prefs, hasMorningPlan: false, dayClosed: false }),
    ).toBe('morning');
  });

  it('hides the morning cue before the morning time', () => {
    expect(
      ritualCueState({ nowMinutes: 7 * 60, prefs, hasMorningPlan: false, dayClosed: false }),
    ).toBeNull();
  });

  it('hides the morning cue once a plan exists', () => {
    expect(
      ritualCueState({ nowMinutes: 10 * 60, prefs, hasMorningPlan: true, dayClosed: false }),
    ).toBeNull();
  });

  it('shows the evening cue when planned, past evening, and not closed', () => {
    expect(
      ritualCueState({ nowMinutes: 21 * 60 + 30, prefs, hasMorningPlan: true, dayClosed: false }),
    ).toBe('evening');
  });

  it('hides the evening cue once the day is closed', () => {
    expect(
      ritualCueState({ nowMinutes: 22 * 60, prefs, hasMorningPlan: true, dayClosed: true }),
    ).toBeNull();
  });

  it('prioritises the morning cue while there is still no plan in the evening', () => {
    expect(
      ritualCueState({ nowMinutes: 22 * 60, prefs, hasMorningPlan: false, dayClosed: false }),
    ).toBe('morning');
  });
});

describe('localDateKey', () => {
  it('formats a local YYYY-MM-DD key', () => {
    expect(localDateKey(new Date(2026, 6, 5))).toBe('2026-07-05');
  });
});
