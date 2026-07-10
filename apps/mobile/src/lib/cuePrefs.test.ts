import { beforeEach, describe, expect, it, mock } from 'bun:test';

// AsyncStorage is a native module; back it with an in-memory store for tests.
const store = new Map<string, string>();
mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  },
}));

const {
  clampTime,
  DEFAULT_CUE_PREFS,
  formatCueTime,
  loadCuePrefs,
  parseCuePrefs,
  saveCuePrefs,
  serializeCuePrefs,
  stepTime,
  toMinutes,
} = await import('./cuePrefs');

beforeEach(() => {
  store.clear();
});

describe('toMinutes / formatCueTime', () => {
  it('converts and formats cue times', () => {
    expect(toMinutes({ hour: 8, minute: 30 })).toBe(510);
    expect(formatCueTime({ hour: 8, minute: 5 })).toBe('08:05');
    expect(formatCueTime({ hour: 21, minute: 0 })).toBe('21:00');
  });
});

describe('stepTime', () => {
  it('advances within the day', () => {
    expect(stepTime({ hour: 8, minute: 30 }, 15)).toEqual({ hour: 8, minute: 45 });
    expect(stepTime({ hour: 8, minute: 45 }, 15)).toEqual({ hour: 9, minute: 0 });
  });

  it('wraps around midnight in both directions', () => {
    expect(stepTime({ hour: 23, minute: 45 }, 15)).toEqual({ hour: 0, minute: 0 });
    expect(stepTime({ hour: 0, minute: 0 }, -15)).toEqual({ hour: 23, minute: 45 });
  });
});

describe('clampTime', () => {
  it('clamps out-of-range values', () => {
    expect(clampTime({ hour: 30, minute: 90 })).toEqual({ hour: 23, minute: 59 });
    expect(clampTime({ hour: -1, minute: -5 })).toEqual({ hour: 0, minute: 0 });
  });
});

describe('parseCuePrefs / serializeCuePrefs', () => {
  it('falls back to defaults for null or garbage', () => {
    expect(parseCuePrefs(null)).toEqual(DEFAULT_CUE_PREFS);
    expect(parseCuePrefs('{bad')).toEqual(DEFAULT_CUE_PREFS);
  });

  it('round-trips a saved preference', () => {
    const prefs = { morning: { hour: 7, minute: 0 }, evening: { hour: 22, minute: 30 } };
    expect(parseCuePrefs(serializeCuePrefs(prefs))).toEqual(prefs);
  });
});

describe('loadCuePrefs / saveCuePrefs', () => {
  it('returns defaults when nothing is stored', async () => {
    expect(await loadCuePrefs()).toEqual(DEFAULT_CUE_PREFS);
  });

  it('persists and reloads chosen cue times', async () => {
    const prefs = { morning: { hour: 6, minute: 15 }, evening: { hour: 20, minute: 0 } };
    await saveCuePrefs(prefs);
    expect(await loadCuePrefs()).toEqual(prefs);
  });
});
