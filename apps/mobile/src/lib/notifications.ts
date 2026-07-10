import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local notifications only (morning cue, evening cue, block-complete nudge). Expo Go
 * on SDK 53+ removed *remote* push support, but locally scheduled notifications still
 * fire in Expo Go, which is all these cues need. Copy stays factual per DESIGN-SPEC §10.
 */

// Foreground presentation: show the banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const MORNING_ID = 'ekagra-morning-cue';
const EVENING_ID = 'ekagra-evening-cue';

/**
 * Requests permission; returns true only when notifications may be shown.
 * Never throws: a denied prompt or an unavailable notification API (e.g. a
 * restricted Expo Go environment) degrades to `false` and callers skip cues.
 */
export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return false;
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Ekagra',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      } catch {
        // Channel setup failing should not block local scheduling.
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedules the two daily cues (idempotent — clears prior copies first). Morning cue
 * prompts the commit ritual; evening cue prompts the close ritual.
 */
export async function scheduleDailyCues(
  morning: { hour: number; minute: number } = { hour: 8, minute: 30 },
  evening: { hour: number; minute: number } = { hour: 21, minute: 0 },
): Promise<void> {
  const granted = await ensurePermission();
  if (!granted) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(MORNING_ID).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(EVENING_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_ID,
      content: {
        title: 'Morning commit',
        body: 'Pick 1–3 tasks for today.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: morning.hour,
        minute: morning.minute,
      },
    });

    await Notifications.scheduleNotificationAsync({
      identifier: EVENING_ID,
      content: {
        title: 'Evening close',
        body: 'Close the day and bank your blocks.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: evening.hour,
        minute: evening.minute,
      },
    });
  } catch {
    // Scheduling is best-effort; the app works without cues.
  }
}

/** Immediate nudge fired when a focus block completes. */
export async function nudgeBlockComplete(): Promise<void> {
  const granted = await ensurePermission();
  if (!granted) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Block earned',
        body: 'Banked. Take the break or start the next block.',
      },
      trigger: null,
    });
  } catch {
    // The earned toast already communicates the block; the nudge is best-effort.
  }
}

/** Clears every scheduled cue (used on sign-out). */
export async function cancelAllCues(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
