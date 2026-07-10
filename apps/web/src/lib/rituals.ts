/**
 * Ritual cue preferences + in-app cue logic (web).
 *
 * Web has no OS notifications, so cues surface as a dismissible banner on Today.
 * The user's chosen morning/evening cue times persist in localStorage; the
 * banner logic here is pure so it can be unit-tested without the DOM.
 */

export type CueTime = { hour: number; minute: number };
export type CuePrefs = { morning: CueTime; evening: CueTime };

export const DEFAULT_CUE_PREFS: CuePrefs = {
  morning: { hour: 8, minute: 30 },
  evening: { hour: 21, minute: 0 },
};

const CUE_KEY = 'ekagra.cuePrefs';
const CLOSED_KEY = 'ekagra.dayClosed';

/** Minutes since local midnight for a cue time (used to compare against `now`). */
export function toMinutes(t: CueTime): number {
  return t.hour * 60 + t.minute;
}

/** Clamps an arbitrary value into a valid CueTime (defends against bad storage). */
export function clampTime(t: { hour: number; minute: number }): CueTime {
  const hour = Math.min(23, Math.max(0, Math.trunc(Number.isFinite(t.hour) ? t.hour : 0)));
  const minute = Math.min(59, Math.max(0, Math.trunc(Number.isFinite(t.minute) ? t.minute : 0)));
  return { hour, minute };
}

/** Formats a cue time as `HH:MM` — both the display label and the `<input type="time">` value. */
export function formatCueTime(t: CueTime): string {
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
}

/** Parses an `<input type="time">` value (`HH:MM`) into a CueTime, or null if malformed. */
export function parseTimeInput(value: string): CueTime | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
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

export type RitualCue = 'morning' | 'evening' | null;

/**
 * Which in-app ritual cue (if any) to surface right now. Morning takes priority
 * while the day has no plan — you close a day you first committed to. Once a plan
 * exists, the evening cue appears after the evening time until the day is closed.
 */
export function ritualCueState(args: {
  nowMinutes: number;
  prefs: CuePrefs;
  hasMorningPlan: boolean;
  dayClosed: boolean;
}): RitualCue {
  const { nowMinutes, prefs, hasMorningPlan, dayClosed } = args;
  if (!hasMorningPlan && nowMinutes >= toMinutes(prefs.morning)) return 'morning';
  if (hasMorningPlan && !dayClosed && nowMinutes >= toMinutes(prefs.evening)) return 'evening';
  return null;
}

/** Local `YYYY-MM-DD` key for a date — the unit the day-closed flag is keyed on. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

// --- Storage (impure) -------------------------------------------------------

export function loadCuePrefs(): CuePrefs {
  try {
    return parseCuePrefs(localStorage.getItem(CUE_KEY));
  } catch {
    return DEFAULT_CUE_PREFS;
  }
}

export function saveCuePrefs(prefs: CuePrefs): void {
  try {
    localStorage.setItem(CUE_KEY, serializeCuePrefs(prefs));
  } catch {
    // Storage can be unavailable (private mode); cues degrade to defaults.
  }
}

/** Records that the day was closed today, so the evening cue stops firing. */
export function markDayClosed(now: Date = new Date()): void {
  try {
    localStorage.setItem(CLOSED_KEY, localDateKey(now));
  } catch {
    // Best-effort; a failed write just means the cue may reappear.
  }
}

export function isDayClosedToday(now: Date = new Date()): boolean {
  try {
    return localStorage.getItem(CLOSED_KEY) === localDateKey(now);
  } catch {
    return false;
  }
}
