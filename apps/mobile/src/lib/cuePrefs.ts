import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Ritual cue preferences (mobile). The user's chosen morning/evening cue times
 * persist in AsyncStorage and drive `scheduleDailyCues`. The pure helpers below
 * are unit-tested without the native storage layer.
 */

export type CueTime = { hour: number; minute: number };
export type CuePrefs = { morning: CueTime; evening: CueTime };

export const DEFAULT_CUE_PREFS: CuePrefs = {
  morning: { hour: 8, minute: 30 },
  evening: { hour: 21, minute: 0 },
};

const CUE_KEY = 'ekagra.cuePrefs';

/** Minutes since local midnight for a cue time. */
export function toMinutes(t: CueTime): number {
  return t.hour * 60 + t.minute;
}

/** Clamps an arbitrary value into a valid CueTime (defends against bad storage). */
export function clampTime(t: { hour: number; minute: number }): CueTime {
  const hour = Math.min(23, Math.max(0, Math.trunc(Number.isFinite(t.hour) ? t.hour : 0)));
  const minute = Math.min(59, Math.max(0, Math.trunc(Number.isFinite(t.minute) ? t.minute : 0)));
  return { hour, minute };
}

/** Formats a cue time as `HH:MM` for display. */
export function formatCueTime(t: CueTime): string {
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

/** Advances a cue time by `deltaMinutes`, wrapping within a 24h day (stepper UI). */
export function stepTime(t: CueTime, deltaMinutes: number): CueTime {
  const total = (((toMinutes(t) + deltaMinutes) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** Parses stored JSON into CuePrefs, falling back to defaults for anything invalid. */
export function parseCuePrefs(raw: string | null): CuePrefs {
  if (!raw) return DEFAULT_CUE_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<CuePrefs>;
    return {
      morning: parsed.morning ? clampTime(parsed.morning) : DEFAULT_CUE_PREFS.morning,
      evening: parsed.evening ? clampTime(parsed.evening) : DEFAULT_CUE_PREFS.evening,
    };
  } catch {
    return DEFAULT_CUE_PREFS;
  }
}

export function serializeCuePrefs(prefs: CuePrefs): string {
  return JSON.stringify(prefs);
}

// --- Storage (impure) -------------------------------------------------------

export async function loadCuePrefs(): Promise<CuePrefs> {
  try {
    return parseCuePrefs(await AsyncStorage.getItem(CUE_KEY));
  } catch {
    return DEFAULT_CUE_PREFS;
  }
}

export async function saveCuePrefs(prefs: CuePrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(CUE_KEY, serializeCuePrefs(prefs));
  } catch {
    // Best-effort; cues degrade to defaults if storage is unavailable.
  }
}
