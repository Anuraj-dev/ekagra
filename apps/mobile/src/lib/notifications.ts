import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Local notifications only (morning cue, evening cue, block-complete nudge).
 *
 * Expo Go on Android (SDK 53+) removed expo-notifications support and logs a
 * loud error the moment the module is imported — so the module is loaded
 * lazily and ONLY outside that environment. In Expo Go on Android the app
 * degrades gracefully to no cues; iOS Expo Go and dev/production builds get
 * the full local-notification behavior. Copy stays factual per DESIGN-SPEC §10.
 */

const isExpoGoAndroid =
  Platform.OS === 'android' &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/** Loads expo-notifications unless unsupported; null means "skip all cues". */
async function loadNotifications(): Promise<NotificationsModule | null> {
  if (cached !== undefined) return cached;
  if (isExpoGoAndroid) {
    cached = null;
    return cached;
  }
  try {
    const mod = await import('expo-notifications');
    // Foreground presentation: show the banner even while the app is open.
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

const MORNING_ID = 'ekagra-morning-cue';
const EVENING_ID = 'ekagra-evening-cue';

/**
 * Requests permission; returns true only when notifications may be shown.
 * Never throws: a denied prompt or an unavailable notification API degrades
 * to `false` and callers skip cues.
 */
export async function ensurePermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
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
  const Notifications = await loadNotifications();
  if (!Notifications) return;
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
  const Notifications = await loadNotifications();
  if (!Notifications) return;
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
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
