import { color } from '@ekagra/tokens';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon } from '../components/icons';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useData } from '../data/DataProvider';
import { motivationApi } from '../lib/api';
import type { RootNav } from '../nav/types';
import { overline, tabular, text } from '../theme/typography';

const WENT_WRONG_TAGS = ['on-plan', 'scope-creep', 'interruptions', 'low-energy', 'other'] as const;
const TAG_LABEL: Record<(typeof WENT_WRONG_TAGS)[number], string> = {
  'on-plan': 'Stayed on plan',
  'scope-creep': 'Scope grew',
  interruptions: 'Interruptions',
  'low-energy': 'Low energy',
  other: 'Something else',
};

export function EveningClose() {
  const nav = useNavigation<RootNav>();
  const insets = useSafeAreaInsets();
  const { tasks, todayEarnedBlocks, todayHonestMinutes, closeEvening } = useData();

  const plannedBlocks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'planned')
        .reduce((sum, t) => sum + (t.estimatedBlocks ?? 1), 0),
    [tasks],
  );

  const [tag, setTag] = useState<(typeof WENT_WRONG_TAGS)[number]>('on-plan');
  const [note, setNote] = useState('');
  const [noteFocused, setNoteFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [weekRate, setWeekRate] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    motivationApi
      .status()
      .then((m) => {
        const seven = m.rates.find((r) => r.windowDays === 7);
        if (active && seven) setWeekRate(seven.completionRate);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      // The API still requires the planMatch boolean; derive it from the single tag input.
      await closeEvening({
        planMatch: tag === 'on-plan',
        wentWrongTag: tag,
        note: note.trim() || null,
      });
      setClosed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close the day.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        title="Evening Close"
        sub="Close the day."
        onBack={() => nav.goBack()}
        topInset={insets.top}
      />

      {closed ? (
        <Enter delay={60} style={{ margin: 16, marginTop: 32 }}>
          <View
            style={{
              backgroundColor: color.surface,
              borderWidth: 1,
              borderColor: color.greenLine,
              borderRadius: 18,
              paddingVertical: 26,
              paddingHorizontal: 22,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 999,
                backgroundColor: color.greenWash,
                borderWidth: 1,
                borderColor: color.greenLine,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckIcon />
            </View>
            <Text style={text(800, { fontSize: 18, color: color.t1, marginTop: 16 })}>
              Day closed.
            </Text>
            {note.trim() !== '' && (
              <Text
                style={text(600, {
                  fontSize: 14,
                  color: color.t2,
                  marginTop: 8,
                  lineHeight: 22,
                  textAlign: 'center',
                })}
              >
                {`“${note.trim()}”`}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' }}>
              <Stat value={`${todayEarnedBlocks}`} label="Blocks banked" tint={color.ember} />
              <Stat value={`${todayHonestMinutes}`} label="Honest minutes" tint={color.green} />
            </View>
          </View>
          <Pressable
            onPress={() => nav.goBack()}
            accessibilityRole="button"
            style={{ marginTop: 20 }}
          >
            <Text style={text(700, { fontSize: 14, color: color.t3, textAlign: 'center' })}>
              ‹ Back to Today
            </Text>
          </Pressable>
        </Enter>
      ) : (
        <Enter delay={60}>
          {/* Stat cards */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 24 }}>
            <Stat
              value={`${todayEarnedBlocks}`}
              suffix={` / ${plannedBlocks}`}
              label="Blocks earned"
              tint={color.ember}
            />
            <Stat value={`${todayHonestMinutes}`} label="Honest minutes" tint={color.green} />
          </View>

          {/* Rate nudge — only when the 7-day rate slips */}
          {weekRate !== null && weekRate < 0.7 && (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 16,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: color.emberWash,
                borderWidth: 1,
                borderColor: color.emberLine,
              }}
            >
              <Text style={text(600, { fontSize: 13, lineHeight: 20, color: color.t2 })}>
                {`7-day rate is at ${Math.round(weekRate * 100)}%. Tomorrow, commit one task fewer and finish it.`}
              </Text>
            </View>
          )}

          {/* What shaped the day */}
          <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            <Text style={[overline, { color: color.t3, marginBottom: 10 }]}>
              What shaped the day
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WENT_WRONG_TAGS.map((t) => {
                const active = tag === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTag(t)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={{
                      borderRadius: 999,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      backgroundColor: active ? color.emberWash : color.surface,
                      borderWidth: 1,
                      borderColor: active ? color.emberLine : color.line,
                    }}
                  >
                    <Text
                      style={text(700, { fontSize: 13, color: active ? color.ember : color.t3 })}
                    >
                      {TAG_LABEL[t]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* One line */}
          <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
            <Text style={[overline, { color: color.t3, marginBottom: 10 }]}>One line</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              onFocus={() => setNoteFocused(true)}
              onBlur={() => setNoteFocused(false)}
              maxLength={1000}
              multiline
              placeholder="One line on today."
              placeholderTextColor={color.t4}
              style={[
                text(500, {
                  height: 104,
                  backgroundColor: color.surface,
                  borderWidth: 1.5,
                  borderColor: noteFocused ? color.ember : color.line,
                  borderRadius: 12,
                  padding: 16,
                  color: color.t1,
                  fontSize: 15,
                  lineHeight: 22,
                  textAlignVertical: 'top',
                }),
              ]}
            />
            {error && (
              <Text style={text(600, { fontSize: 13, color: color.danger, marginTop: 10 })}>
                {error}
              </Text>
            )}
            <Pressable
              onPress={submit}
              disabled={busy}
              style={{
                marginTop: 14,
                borderRadius: 999,
                paddingVertical: 17,
                alignItems: 'center',
                backgroundColor: color.ember,
              }}
            >
              <Text style={text(800, { fontSize: 16, color: color.bg })}>
                {busy ? 'Closing…' : 'Close the day'}
              </Text>
            </Pressable>
          </View>
        </Enter>
      )}
    </Screen>
  );
}

function Stat({
  value,
  suffix,
  label,
  tint,
}: {
  value: string;
  suffix?: string;
  label: string;
  tint: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.line,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <Text
        style={[
          tabular,
          text(800, { fontSize: 34, letterSpacing: -0.5, lineHeight: 34, color: tint }),
        ]}
      >
        {value}
        {suffix && <Text style={text(700, { fontSize: 17, color: color.t4 })}>{suffix}</Text>}
      </Text>
      <Text style={text(700, { fontSize: 12, color: color.t3, marginTop: 8 })}>{label}</Text>
    </View>
  );
}
