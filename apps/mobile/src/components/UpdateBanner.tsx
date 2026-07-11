import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadDismissedVersion, saveDismissedVersion } from '../lib/updatePrefs';
import type { UpdateErrorReason } from '../lib/updates';
import { useUpdater } from '../lib/useUpdater';
import { color } from '../theme/tokens';
import { text } from '../theme/typography';

const ERROR_COPY: Record<UpdateErrorReason, string> = {
  offline: 'Download failed — check your connection and retry.',
  'missing-asset': 'The APK is missing from the release. Retry later.',
  'hash-mismatch': 'Download was corrupted. Tap to retry.',
  'verify-failed': 'Could not verify the download. Tap to retry.',
  'install-not-permitted': 'Could not launch the installer on this device.',
};

/**
 * A non-blocking "update available" banner. On mount it silently checks the
 * `app_releases` table for a newer Android build; if one exists and the user
 * has not already dismissed that exact version, a floating pill appears at the
 * top. Tapping it walks pomo's updater state machine: download the APK into
 * the app cache, verify its SHA-256, then hand it to the Android installer
 * (browser handoff as last resort). Dismissing remembers the version so the
 * banner stays hidden until an even newer release ships. Every failure path
 * is silent or recoverable — the app is never blocked.
 */
export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const { state, check, install, reset } = useUpdater();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const dismissed = await loadDismissedVersion();
      const update = await check({ silent: true });
      if (cancelled || !update) return;
      if (dismissed === update.version) setHidden(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [check]);

  if (hidden) return null;
  if (
    state.phase === 'idle' ||
    state.phase === 'checking' ||
    state.phase === 'up-to-date' ||
    (state.phase === 'error' && !state.update)
  ) {
    return null;
  }

  const update = state.update;
  const busy =
    state.phase === 'downloading' || state.phase === 'verifying' || state.phase === 'installing';

  const title =
    state.phase === 'update-available'
      ? `Update available · v${update?.version}`
      : state.phase === 'downloading'
        ? `Downloading v${update?.version}…`
        : state.phase === 'verifying'
          ? 'Verifying download…'
          : state.phase === 'installing'
            ? 'Opening installer…'
            : `Update v${update?.version}`;

  const subtitle =
    state.phase === 'error'
      ? state.detail
        ? `${ERROR_COPY[state.reason]} (${state.detail})`
        : ERROR_COPY[state.reason]
      : state.phase === 'update-available'
        ? update?.notes?.trim() || 'Tap to download and install.'
        : 'Keep the app open.';

  const onPress = () => {
    if (state.phase === 'update-available' || state.phase === 'error') void install();
  };

  const dismiss = () => {
    if (update) void saveDismissedVersion(update.version);
    setHidden(true);
    reset();
  };

  return (
    <View
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        top: insets.top + 8,
        backgroundColor: color.bg,
        borderWidth: 1,
        borderColor: state.phase === 'error' ? color.t3 : color.ember,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          state.phase === 'error' ? 'Retry update' : `Update to version ${update?.version}`
        }
        disabled={busy}
        onPress={onPress}
        style={{ flex: 1 }}
      >
        <Text style={text(700, { fontSize: 13, color: color.emberHi })}>{title}</Text>
        <Text numberOfLines={2} style={text(500, { fontSize: 12, color: color.t3, marginTop: 2 })}>
          {subtitle}
        </Text>
      </Pressable>
      {busy ? (
        <ActivityIndicator color={color.ember} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss update"
          onPress={dismiss}
          hitSlop={8}
        >
          <Text style={text(700, { fontSize: 13, color: color.t3 })}>Later</Text>
        </Pressable>
      )}
    </View>
  );
}
