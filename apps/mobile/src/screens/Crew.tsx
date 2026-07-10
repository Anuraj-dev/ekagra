import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { useData } from '../data/DataProvider';
import { forgivenessApi } from '../lib/api';
import { color } from '../theme/tokens';
import { tabular, text } from '../theme/typography';

/**
 * Crew — weekly earned blocks, totals only. Phase 2 exposes no friends-leaderboard
 * endpoint to the client, so this shows your own weekly totals and the
 * forgiveness token; the ranked list lands with the leaderboard endpoint.
 */
export function Crew() {
  const insets = useSafeAreaInsets();
  const { todayEarnedBlocks, todayHonestMinutes } = useData();
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function applyForgiveness() {
    setBusy(true);
    setError(null);
    try {
      const res = await forgivenessApi.apply();
      setApplied(res.usedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the token.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Enter style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <Text style={text(800, { fontSize: 26, letterSpacing: -0.4, color: color.t1 })}>Crew</Text>
        <Text style={text(600, { fontSize: 13, color: color.t3, marginTop: 6 })}>
          Weekly earned blocks. Totals only — tasks stay private.
        </Text>
      </Enter>

      <Enter delay={60}>
        {/* Forgiveness token — plain recessed row */}
        <View
          style={{
            marginTop: 24,
            marginHorizontal: 16,
            backgroundColor: color.surface2,
            borderWidth: 1,
            borderColor: color.lineSoft,
            borderRadius: 16,
            paddingVertical: 15,
            paddingHorizontal: 18,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color.green }} />
            <View style={{ flex: 1 }}>
              <Text style={text(700, { fontSize: 14, color: color.t2 })}>Forgiveness token</Text>
              <Text style={text(600, { fontSize: 12, color: color.t4, marginTop: 2 })}>
                {applied ? 'Used this week.' : 'One per week. Wipes one missed day from the rate.'}
              </Text>
            </View>
            {!applied && (
              <Pressable
                onPress={applyForgiveness}
                disabled={busy}
                style={({ pressed }) => ({ opacity: pressed || busy ? 0.6 : 1 })}
              >
                <Text style={text(700, { fontSize: 13, color: color.green })}>Use</Text>
              </Pressable>
            )}
          </View>
          {error && (
            <Text style={text(600, { fontSize: 12, color: '#E4796B', marginTop: 8 })}>{error}</Text>
          )}
        </View>

        {/* You row — the only highlighted row */}
        <View
          style={{
            marginTop: 12,
            marginHorizontal: 16,
            backgroundColor: 'rgba(240,138,62,0.10)',
            borderWidth: 1,
            borderColor: 'rgba(240,138,62,0.45)',
            borderRadius: 16,
            paddingVertical: 15,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              backgroundColor: color.surface3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={text(800, { fontSize: 13, color: color.ember })}>You</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={text(700, { fontSize: 14, color: color.t1 })}>This session</Text>
            <Text style={text(600, { fontSize: 12, color: color.t3, marginTop: 2 })}>
              {todayHonestMinutes} honest minutes
            </Text>
          </View>
          <Text style={[tabular, text(800, { fontSize: 20, color: color.ember })]}>
            {todayEarnedBlocks}
          </Text>
        </View>

        <Text
          style={text(600, {
            paddingTop: 20,
            paddingHorizontal: 20,
            fontSize: 12,
            color: color.t5,
            lineHeight: 18,
          })}
        >
          The ranked Crew list lands with the leaderboard endpoint. Aggregates only — task titles
          and reflections are never shared.
        </Text>
      </Enter>
    </Screen>
  );
}
