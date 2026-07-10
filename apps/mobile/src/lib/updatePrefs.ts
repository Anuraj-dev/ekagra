import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistence for the "an update is available" banner. We remember the version
 * the user last dismissed so the banner stays hidden for that release but
 * reappears when a newer version is published. Mirrors cuePrefs.ts: pure
 * parse/serialize helpers (unit-testable) plus best-effort async storage
 * wrappers that silently fall back rather than throwing.
 */

const DISMISSED_KEY = 'ekagra.dismissedUpdateVersion';

/** Normalizes a stored value into a version string or null. */
export function parseDismissedVersion(raw: string | null): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function loadDismissedVersion(): Promise<string | null> {
  try {
    return parseDismissedVersion(await AsyncStorage.getItem(DISMISSED_KEY));
  } catch {
    return null;
  }
}

export async function saveDismissedVersion(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DISMISSED_KEY, version);
  } catch {
    // Best-effort; a failed write just means the banner may reappear.
  }
}
