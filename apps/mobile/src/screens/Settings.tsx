import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
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
import type { RootNav } from '../nav/types';
import { color } from '../theme/tokens';
import { overline, tabular, text } from '../theme/typography';

/** Settings — pushed modal over Today (not a tab). Account + paired devices. */
export function Settings() {
  const nav = useNavigation<RootNav>();
  const { session, signOut } = useAuth();
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [newToken, setNewToken] = useState<{ deviceId: string; deviceToken: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cuePrefs, setCuePrefs] = useState<CuePrefs>(DEFAULT_CUE_PREFS);

  useEffect(() => {
    void loadCuePrefs().then(setCuePrefs);
  }, []);

  async function adjustCue(which: 'morning' | 'evening', deltaMinutes: number) {
    const next: CuePrefs = { ...cuePrefs, [which]: stepTime(cuePrefs[which], deltaMinutes) };
    setCuePrefs(next);
    await saveCuePrefs(next);
    await scheduleDailyCues(next.morning, next.evening);
  }

  const refresh = useCallback(async () => {
    try {
      setDevices(await devicesApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load devices.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function pairDevice() {
    setError(null);
    try {
      const res = await devicesApi.register('Desk companion');
      setNewToken(res);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register the device.');
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await devicesApi.revoke(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke the device.');
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Settings" onBack={() => nav.goBack()} />

      <Enter delay={60}>
        {/* Account */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[overline, { color: color.t3, marginBottom: 10 }]}>Account</Text>
          <View
            style={{
              backgroundColor: color.surface2,
              borderWidth: 1,
              borderColor: color.lineSoft,
              borderRadius: 16,
              paddingVertical: 15,
              paddingHorizontal: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text numberOfLines={1} style={text(600, { fontSize: 14, color: color.t2, flex: 1 })}>
              {session?.user.email ?? 'Signed in'}
            </Text>
            <Pressable
              onPress={() => void signOut()}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginLeft: 12 })}
            >
              <Text style={text(700, { fontSize: 13, color: color.ember })}>Sign out</Text>
            </Pressable>
          </View>
        </View>

        {/* Ritual cues */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[overline, { color: color.t3, marginBottom: 10 }]}>Ritual cues</Text>
          <CueRow
            label="Morning commit"
            value={formatCueTime(cuePrefs.morning)}
            onStep={(delta) => void adjustCue('morning', delta)}
          />
          <CueRow
            label="Evening close"
            value={formatCueTime(cuePrefs.evening)}
            onStep={(delta) => void adjustCue('evening', delta)}
          />
          <Text style={text(600, { fontSize: 12, color: color.t5, marginTop: 8 })}>
            Local reminders only — no notifications leave the device.
          </Text>
        </View>

        {/* Ekagra Desk */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[overline, { color: color.t3, marginBottom: 10 }]}>Ekagra Desk</Text>
          {devices
            .filter((d) => d.revoked_at === null)
            .map((device) => (
              <View
                key={device.id}
                style={{
                  backgroundColor: color.surface2,
                  borderWidth: 1,
                  borderColor: color.lineSoft,
                  borderRadius: 16,
                  paddingVertical: 15,
                  paddingHorizontal: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={text(700, { fontSize: 14, color: color.t2 })}>{device.label}</Text>
                  <Text style={text(600, { fontSize: 12, color: color.t4, marginTop: 2 })}>
                    {device.last_seen_at
                      ? `Last seen ${new Date(device.last_seen_at).toLocaleString()}`
                      : 'Never connected'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void revoke(device.id)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginLeft: 12 })}
                >
                  <Text style={text(700, { fontSize: 13, color: color.t4 })}>Revoke</Text>
                </Pressable>
              </View>
            ))}
          <Pressable
            onPress={pairDevice}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              paddingVertical: 8,
              paddingHorizontal: 4,
            })}
          >
            <Text style={text(700, { fontSize: 13, color: color.ember })}>
              + Pair a desk device
            </Text>
          </Pressable>
          {newToken && (
            <View
              style={{
                marginTop: 10,
                backgroundColor: 'rgba(91,191,138,0.12)',
                borderWidth: 1,
                borderColor: 'rgba(91,191,138,0.40)',
                borderRadius: 12,
                paddingVertical: 13,
                paddingHorizontal: 16,
              }}
            >
              <Text style={text(700, { fontSize: 12, color: color.green })}>
                Device token — shown once, copy it into the firmware:
              </Text>
              <View
                style={{
                  marginTop: 8,
                  backgroundColor: color.surface2,
                  borderWidth: 1,
                  borderColor: color.lineSoft,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
              >
                <Text
                  selectable
                  style={[tabular, text(500, { fontSize: 11, color: color.t2, lineHeight: 16 })]}
                >
                  {newToken.deviceToken}
                </Text>
              </View>
              <Text style={text(600, { fontSize: 11, color: color.t5, marginTop: 6 })}>
                Shown once — copy it now.
              </Text>
            </View>
          )}
          {error && (
            <Text style={text(600, { fontSize: 13, color: '#E4796B', marginTop: 10 })}>
              {error}
            </Text>
          )}
        </View>
      </Enter>
    </Screen>
  );
}

/** One ritual-cue row: label, tabular time, and −/+ steppers (15-minute steps). */
function CueRow({
  label,
  value,
  onStep,
}: {
  label: string;
  value: string;
  onStep: (deltaMinutes: number) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: color.surface2,
        borderWidth: 1,
        borderColor: color.lineSoft,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <Text style={text(700, { fontSize: 14, color: color.t2, flex: 1 })}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Stepper glyph="−" onPress={() => onStep(-15)} />
        <Text
          style={[
            tabular,
            text(700, { fontSize: 16, color: color.t1, minWidth: 54, textAlign: 'center' }),
          ]}
        >
          {value}
        </Text>
        <Stepper glyph="+" onPress={() => onStep(15)} />
      </View>
    </View>
  );
}

function Stepper({ glyph, onPress }: { glyph: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        width: 32,
        height: 32,
        borderRadius: 999,
        backgroundColor: color.surface3,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text style={text(700, { fontSize: 18, color: color.ember, lineHeight: 20 })}>{glyph}</Text>
    </Pressable>
  );
}
