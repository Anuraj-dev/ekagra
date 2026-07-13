import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { type DeviceSummary, devicesApi } from '../lib/api';
import {
  type CuePrefs,
  DEFAULT_CUE_PREFS,
  formatCueTime,
  loadCuePrefs,
  saveCuePrefs,
  stepTime,
} from '../lib/cuePrefs';
import { scheduleDailyCues } from '../lib/notifications';
import { currentVersion } from '../lib/updates';
import { useUpdater } from '../lib/useUpdater';
import type { RootNav } from '../nav/types';
import { useSetAppearance, useTheme } from '../theme/ThemeProvider';
import { display, ui } from '../theme/typography';

type Feedback = {
  phase: 'pending' | 'success' | 'error';
  message: string;
  retry?: () => void;
};

/** Settings — the account, device, cue, appearance, and app controls. */
export function Settings() {
  const t = useTheme();
  const setAppearance = useSetAppearance();
  const nav = useNavigation<RootNav>();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [newToken, setNewToken] = useState<{ deviceId: string; deviceToken: string } | null>(null);
  const [deviceFeedback, setDeviceFeedback] = useState<Feedback | null>(null);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);
  const [cuePrefs, setCuePrefs] = useState<CuePrefs>(DEFAULT_CUE_PREFS);
  const [cueFeedback, setCueFeedback] = useState<Feedback | null>(null);
  const [signOutFeedback, setSignOutFeedback] = useState<Feedback | null>(null);

  const cueCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueCommitToken = useRef(0);
  const latestCuePrefs = useRef(cuePrefs);

  useEffect(() => {
    void loadCuePrefs().then((loaded) => {
      latestCuePrefs.current = loaded;
      setCuePrefs(loaded);
    });
  }, []);

  // Rapid stepper taps must not interleave save/reschedule calls: each tap
  // updates state immediately, but persisting + rescheduling is debounced and
  // latest-wins (a stale async reschedule is dropped via the token check).
  useEffect(() => {
    return () => {
      cueCommitToken.current += 1;
      if (cueCommitTimer.current) clearTimeout(cueCommitTimer.current);
    };
  }, []);

  function queueCueCommit(next: CuePrefs) {
    if (cueCommitTimer.current) clearTimeout(cueCommitTimer.current);
    const token = ++cueCommitToken.current;
    setCueFeedback({ phase: 'pending', message: 'Saving reminders…' });
    cueCommitTimer.current = setTimeout(() => {
      void (async () => {
        try {
          await saveCuePrefs(next);
          // A newer tap superseded this commit while saving — skip the reschedule.
          if (token !== cueCommitToken.current) return;
          await scheduleDailyCues(next.morning, next.evening);
          if (token === cueCommitToken.current) {
            setCueFeedback({ phase: 'success', message: 'Saved · reminders updated.' });
          }
        } catch (err) {
          if (token !== cueCommitToken.current) return;
          setCueFeedback({
            phase: 'error',
            message: err instanceof Error ? err.message : 'Could not update reminders.',
            retry: () => queueCueCommit(latestCuePrefs.current),
          });
        }
      })();
    }, 400);
  }

  function adjustCue(which: 'morning' | 'evening', deltaMinutes: number) {
    const next: CuePrefs = {
      ...latestCuePrefs.current,
      [which]: stepTime(latestCuePrefs.current[which], deltaMinutes),
    };
    latestCuePrefs.current = next;
    setCuePrefs(next);
    queueCueCommit(next);
  }

  const refresh = useCallback(async (): Promise<boolean> => {
    setDevicesLoading(true);
    try {
      setDevices(await devicesApi.list());
      return true;
    } catch (err) {
      setDeviceFeedback({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Could not load devices.',
        retry: () => {
          void refresh();
        },
      });
      return false;
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function pairDevice() {
    setDeviceFeedback({ phase: 'pending', message: 'Pairing desk device…' });
    try {
      const res = await devicesApi.register('Desk companion');
      setNewToken(res);
      const refreshed = await refresh();
      if (refreshed) {
        setDeviceFeedback({ phase: 'success', message: 'Desk device paired.' });
      }
    } catch (err) {
      setDeviceFeedback({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Could not register the device.',
        retry: () => {
          void pairDevice();
        },
      });
    }
  }

  async function revoke(id: string) {
    setRevokingDeviceId(id);
    setDeviceFeedback({ phase: 'pending', message: 'Revoking desk device…' });
    try {
      await devicesApi.revoke(id);
      const refreshed = await refresh();
      if (refreshed) {
        setDeviceFeedback({ phase: 'success', message: 'Desk device revoked.' });
      }
    } catch (err) {
      setDeviceFeedback({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Could not revoke the device.',
        retry: () => {
          void revoke(id);
        },
      });
    } finally {
      setRevokingDeviceId(null);
    }
  }

  function confirmRevoke(device: DeviceSummary) {
    Alert.alert('Revoke device?', `${device.label} will lose access. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => void revoke(device.id) },
    ]);
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void handleSignOut() },
    ]);
  }

  async function handleSignOut() {
    setSignOutFeedback({ phase: 'pending', message: 'Signing out…' });
    try {
      await signOut();
      setSignOutFeedback({ phase: 'success', message: 'Signed out.' });
    } catch (err) {
      setSignOutFeedback({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Could not sign out.',
        retry: () => {
          void handleSignOut();
        },
      });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 44,
        }}
      >
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => nav.goBack()}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            alignSelf: 'flex-start',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={ui(600, { color: t.textSecondary, fontSize: 13 })}>‹ Back</Text>
        </Pressable>
        <Text style={display(600, { color: t.ink, fontSize: 32, lineHeight: 38 })}>Settings</Text>

        <Section title="Account" t={t} />
        <SettingRow t={t}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={ui(400, { color: t.ink, fontSize: 15 })}>
              {session?.user.email ?? 'Signed in'}
            </Text>
            {signOutFeedback && <FeedbackLine feedback={signOutFeedback} t={t} />}
          </View>
          <ActionButton
            label={signOutFeedback?.phase === 'pending' ? 'Signing out…' : 'Sign out'}
            onPress={confirmSignOut}
            disabled={signOutFeedback?.phase === 'pending'}
            t={t}
          />
        </SettingRow>

        <Section title="Appearance" t={t} />
        <SettingRow t={t}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={ui(400, { color: t.ink, fontSize: 15 })}>Theme</Text>
            <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 4 })}>
              Light is the primary planning desk.
            </Text>
          </View>
          <View
            accessibilityLabel="Appearance"
            style={{
              flexDirection: 'row',
              padding: 3,
              backgroundColor: t.surfaceSunk,
              borderRadius: t.radii.pill,
              borderWidth: 1,
              borderColor: t.line,
            }}
          >
            {(['light', 'dark'] as const).map((mode) => {
              const selected = t.appearance === mode;
              const label = mode === 'light' ? 'Light' : 'Dark';
              return (
                <Pressable
                  key={mode}
                  accessibilityLabel={`${label} appearance`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setAppearance(mode)}
                  style={({ pressed }) => ({
                    minWidth: 58,
                    minHeight: 44,
                    paddingHorizontal: 10,
                    borderRadius: t.radii.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? t.ink : 'transparent',
                    opacity: pressed ? 0.72 : 1,
                  })}
                >
                  <Text
                    style={ui(600, {
                      color: selected ? t.inkOnDark : t.textSecondary,
                      fontSize: 13,
                    })}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SettingRow>

        <Section title="Ritual cues" t={t} />
        <CueRow
          label="Morning commit"
          value={formatCueTime(cuePrefs.morning)}
          onStep={(delta) => adjustCue('morning', delta)}
          t={t}
        />
        <CueRow
          label="Evening close"
          value={formatCueTime(cuePrefs.evening)}
          onStep={(delta) => adjustCue('evening', delta)}
          t={t}
        />
        <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 4 })}>
          Local reminders only — no notifications leave the device.
        </Text>
        {cueFeedback && <FeedbackLine feedback={cueFeedback} t={t} />}

        <Section title="Ekagra Desk" t={t} />
        {devicesLoading && (
          <Text style={ui(400, { color: t.textSecondary, fontSize: 13, paddingVertical: 12 })}>
            Loading paired devices…
          </Text>
        )}
        {!devicesLoading && devices.filter((device) => device.revoked_at === null).length === 0 && (
          <Text style={ui(400, { color: t.textSecondary, fontSize: 13, paddingVertical: 12 })}>
            No paired devices.
          </Text>
        )}
        {devices
          .filter((device) => device.revoked_at === null)
          .map((device) => (
            <SettingRow key={device.id} t={t}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={ui(600, { color: t.ink, fontSize: 15 })}>{device.label}</Text>
                <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 4 })}>
                  {device.last_seen_at
                    ? `Last seen ${new Date(device.last_seen_at).toLocaleString()}`
                    : 'Never connected'}
                </Text>
              </View>
              <ActionButton
                label={revokingDeviceId === device.id ? 'Revoking…' : 'Revoke'}
                onPress={() => confirmRevoke(device)}
                disabled={revokingDeviceId !== null}
                destructive
                t={t}
              />
            </SettingRow>
          ))}
        <ActionButton
          label={deviceFeedback?.phase === 'pending' ? 'Working…' : '+ Pair a desk device'}
          onPress={() => void pairDevice()}
          disabled={deviceFeedback?.phase === 'pending'}
          t={t}
          fullWidth
        />
        {newToken && (
          <View
            style={{
              marginTop: 12,
              padding: 16,
              backgroundColor: t.surfaceSunk,
              borderWidth: 1,
              borderColor: t.lineStrong,
              borderRadius: t.radii.card,
            }}
          >
            <Text style={ui(600, { color: t.textSecondary, fontSize: 13 })}>
              Device token — copy it into the firmware now.
            </Text>
            <Text
              selectable
              style={ui(500, {
                color: t.ink,
                fontSize: 12,
                lineHeight: 18,
                marginTop: 10,
                padding: 12,
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.line,
                borderRadius: t.radii.sm,
              })}
            >
              {newToken.deviceToken}
            </Text>
          </View>
        )}
        {deviceFeedback && <FeedbackLine feedback={deviceFeedback} t={t} />}

        <Section title="App" t={t} />
        <UpdateRow t={t} />
      </ScrollView>
    </View>
  );
}

function Section({ title, t }: { title: string; t: ReturnType<typeof useTheme> }) {
  return (
    <Text
      style={ui(600, {
        color: t.textSecondary,
        fontSize: 11,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        marginTop: 28,
        marginBottom: 8,
      })}
    >
      {title}
    </Text>
  );
}

function SettingRow({
  children,
  t,
}: {
  children: React.ReactNode;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={[
        t.elevationNative.low,
        {
          minHeight: 70,
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.line,
          borderRadius: t.radii.card,
          marginBottom: 8,
        },
      ]}
    >
      {children}
    </View>
  );
}

function CueRow({
  label,
  value,
  onStep,
  t,
}: {
  label: string;
  value: string;
  onStep: (deltaMinutes: number) => void;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <SettingRow t={t}>
      <Text style={ui(400, { color: t.ink, fontSize: 15, flex: 1 })}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Stepper label={`${label} earlier`} glyph="−" onPress={() => onStep(-15)} t={t} />
        <Text style={ui(600, { color: t.ink, fontSize: 16, minWidth: 54, textAlign: 'center' })}>
          {value}
        </Text>
        <Stepper label={`${label} later`} glyph="+" onPress={() => onStep(15)} t={t} />
      </View>
    </SettingRow>
  );
}

function Stepper({
  label,
  glyph,
  onPress,
  t,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: t.radii.pill,
        backgroundColor: pressed ? t.lineStrong : t.surfaceSunk,
        borderWidth: 1,
        borderColor: t.lineStrong,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text style={ui(600, { color: t.ink, fontSize: 19, lineHeight: 22 })}>{glyph}</Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  destructive,
  fullWidth,
  t,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  fullWidth?: boolean;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        minWidth: fullWidth ? undefined : 84,
        alignSelf: fullWidth ? 'stretch' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: t.radii.pill,
        borderWidth: 1,
        borderColor: destructive ? t.dangerLine : t.lineStrong,
        backgroundColor: pressed ? t.surfaceSunk : 'transparent',
        opacity: disabled ? 0.55 : 1,
        marginTop: fullWidth ? 4 : 0,
      })}
    >
      <Text style={ui(600, { color: destructive ? t.dangerText : t.ink, fontSize: 13 })}>
        {label}
      </Text>
    </Pressable>
  );
}

function FeedbackLine({ feedback, t }: { feedback: Feedback; t: ReturnType<typeof useTheme> }) {
  const color = feedback.phase === 'error' ? t.dangerText : t.textSecondary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
      <Text style={ui(500, { color, fontSize: 13, flex: 1 })}>{feedback.message}</Text>
      {feedback.retry && (
        <Pressable
          accessibilityLabel="Retry"
          accessibilityRole="button"
          onPress={feedback.retry}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: 4,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={ui(700, { color: t.dangerText, fontSize: 12 })}>RETRY</Text>
        </Pressable>
      )}
    </View>
  );
}

function UpdateRow({ t }: { t: ReturnType<typeof useTheme> }) {
  const { state, check, install } = useUpdater();
  const busy =
    state.phase === 'checking' ||
    state.phase === 'downloading' ||
    state.phase === 'verifying' ||
    state.phase === 'installing';
  const status =
    state.phase === 'checking'
      ? 'Checking…'
      : state.phase === 'up-to-date'
        ? 'Up to date.'
        : state.phase === 'update-available'
          ? `v${state.update.version} is available${state.update.notes?.trim() ? ` — ${state.update.notes.trim()}` : ''}`
          : state.phase === 'downloading'
            ? `Downloading v${state.update.version}…`
            : state.phase === 'verifying'
              ? 'Verifying download…'
              : state.phase === 'installing'
                ? 'Opening installer…'
                : state.phase === 'error'
                  ? state.reason === 'offline'
                    ? 'Offline — retry.'
                    : state.reason === 'hash-mismatch'
                      ? 'Download was corrupted — retry.'
                      : state.reason === 'verify-failed'
                        ? 'Verify failed — retry.'
                        : state.reason === 'missing-asset'
                          ? 'The APK is missing from the release.'
                          : 'Could not launch the installer.'
                  : null;
  const debugDetail = __DEV__ && state.phase === 'error' && state.detail ? state.detail : null;
  const actionLabel =
    state.phase === 'update-available'
      ? 'Install'
      : state.phase === 'error'
        ? 'Retry'
        : 'Check for updates';
  const onAction = () => {
    if (state.phase === 'update-available' || state.phase === 'error') void install();
    else void check();
  };

  return (
    <SettingRow t={t}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={ui(400, { color: t.ink, fontSize: 15 })}>Ekagra v{currentVersion()}</Text>
        {status && (
          <Text
            style={ui(400, {
              color: state.phase === 'error' ? t.dangerText : t.textSecondary,
              fontSize: 13,
              marginTop: 5,
            })}
          >
            {status}
          </Text>
        )}
        {debugDetail && (
          <Text style={ui(400, { color: t.textSecondary, fontSize: 12, marginTop: 4 })}>
            {debugDetail}
          </Text>
        )}
      </View>
      <ActionButton
        label={busy ? 'Working…' : actionLabel}
        onPress={onAction}
        disabled={busy}
        t={t}
      />
    </SettingRow>
  );
}
