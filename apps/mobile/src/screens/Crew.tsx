import type { Friend } from '@ekagra/core';
import { useNavigation } from '@react-navigation/native';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { MotivationPanel, RateRings } from '../components/Motivation';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import {
  ApiError,
  forgivenessApi,
  friendsApi,
  leaderboardApi,
  motivationApi,
  type WeeklyLeaderboardRow,
} from '../lib/api';
import type { RootNav } from '../nav/types';
import { color } from '../theme/tokens';
import { overline, tabular, text } from '../theme/typography';

export function Crew() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { session } = useAuth();
  const [motivation, setMotivation] = useState<Awaited<
    ReturnType<typeof motivationApi.status>
  > | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([motivationApi.status(), friendsApi.list(), leaderboardApi.weekly()])
      .then(([m, f, l]) => {
        if (active) {
          setMotivation(m);
          setFriends(f);
          setLeaderboard(l);
        }
      })
      .catch(
        (e) =>
          active && setError(e instanceof Error ? e.message : 'Crew could not load right now.'),
      );
    return () => {
      active = false;
    };
  }, []);
  async function run(action: () => Promise<unknown>, success?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      success?.();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'That change could not be made. Check your Crew limit or the current invite.'
          : e instanceof Error
            ? e.message
            : 'Could not update your Crew.',
      );
    } finally {
      setBusy(false);
    }
  }
  function inviteFriend() {
    const email = invite.trim();
    if (!email) return;
    run(
      () => friendsApi.invite({ email }),
      () => {
        setInvite('');
        friendsApi
          .list()
          .then(setFriends)
          .catch(() => undefined);
      },
    );
  }
  const accepted = (friends ?? []).filter(
    (f) => f.status === 'accepted' || f.direction === 'friend',
  );
  return (
    <Screen>
      <Enter style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <Text style={text(800, { fontSize: 26, letterSpacing: -0.4, color: color.t1 })}>Crew</Text>
        <Text style={text(600, { fontSize: 13, color: color.t3, marginTop: 6 })}>
          A little visible momentum. Nothing personal is shared.
        </Text>
      </Enter>
      <Enter delay={60}>
        {motivation && (
          <View style={card}>
            <Text style={[overline, { color: color.t3, marginBottom: 12 }]}>Your rhythm</Text>
            <RateRings rates={motivation.rates} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <Text style={[tabular, text(800, { fontSize: 26, color: color.ember })]}>
                {motivation.streakDays}
              </Text>
              <Text style={text(700, { flex: 1, fontSize: 12, color: color.t3 })}>
                day streak · misses dent rates, they do not erase them
              </Text>
            </View>
          </View>
        )}
        {motivation && (
          <MotivationPanel status={motivation} onPlan={() => nav.navigate('MorningCommit')} />
        )}
        <Forgiveness
          applied={applied}
          busy={busy}
          onApply={() =>
            run(
              () => forgivenessApi.apply(),
              () => setApplied(true),
            )
          }
          error={error}
        />
        <Section title="Weekly Crew">
          {leaderboard === null ? (
            <Muted>Loading the leaderboard…</Muted>
          ) : leaderboard.length === 0 ? (
            <Muted>Complete a block to start this week’s board.</Muted>
          ) : (
            leaderboard.map((row, index) => (
              <View key={row.userId} style={rowStyle}>
                <Text
                  style={[
                    tabular,
                    text(800, {
                      width: 22,
                      color: row.userId === session?.user.id ? color.ember : color.t4,
                    }),
                  ]}
                >
                  {index + 1}
                </Text>
                <Text
                  style={text(700, {
                    flex: 1,
                    color: row.userId === session?.user.id ? color.t1 : color.t2,
                  })}
                >
                  {row.userId === session?.user.id ? 'You' : row.displayName || 'Crew member'}
                </Text>
                <Text style={[tabular, text(800, { fontSize: 20, color: color.t1 })]}>
                  {row.earnedBlocks}
                </Text>
              </View>
            ))
          )}
        </Section>
        <Section title={`Friends · ${accepted.length}/12`}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TextInput
              value={invite}
              onChangeText={setInvite}
              placeholder="Invite by email"
              placeholderTextColor={color.t4}
              autoCapitalize="none"
              keyboardType="email-address"
              style={inputStyle}
            />
            <Action label="Invite" disabled={busy || !invite.trim()} onPress={inviteFriend} />
          </View>
          {friends === null ? (
            <Muted>Loading friends…</Muted>
          ) : friends.length === 0 ? (
            <Muted>Your Crew is empty. Invite someone to make progress visible together.</Muted>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} style={rowStyle}>
                <View style={{ flex: 1 }}>
                  <Text style={text(700, { fontSize: 14, color: color.t2 })}>
                    {friend.displayName}
                  </Text>
                  <Text style={text(600, { fontSize: 11, color: color.t4, marginTop: 3 })}>
                    {friend.direction === 'incoming' ? 'Wants to join' : friend.status}
                  </Text>
                </View>
                {friend.direction === 'incoming' && friend.status === 'pending' && (
                  <Action
                    label="Accept"
                    disabled={busy}
                    onPress={() =>
                      run(
                        () => friendsApi.accept(friend.id),
                        () =>
                          setFriends(
                            (old) =>
                              old?.map((f) =>
                                f.id === friend.id
                                  ? { ...f, status: 'accepted', direction: 'friend' }
                                  : f,
                              ) ?? null,
                          ),
                      )
                    }
                  />
                )}
                <Action
                  label="Remove"
                  muted
                  disabled={busy}
                  onPress={() =>
                    run(
                      () => friendsApi.remove(friend.id),
                      () => setFriends((old) => old?.filter((f) => f.id !== friend.id) ?? null),
                    )
                  }
                />
              </View>
            ))
          )}
          {error && (
            <Text style={text(600, { fontSize: 12, color: '#E4796B', marginTop: 10 })}>
              {error}
            </Text>
          )}
        </Section>
        <Text
          style={text(600, {
            paddingHorizontal: 20,
            paddingTop: 20,
            fontSize: 12,
            lineHeight: 18,
            color: color.t5,
          })}
        >
          Only names and earned blocks appear here. Tasks, reflections, and day details stay
          private.
        </Text>
      </Enter>
    </Screen>
  );
}
const card = {
  marginTop: 24,
  marginHorizontal: 16,
  padding: 16,
  backgroundColor: color.surface2,
  borderWidth: 1,
  borderColor: color.lineSoft,
  borderRadius: 16,
} as const;
const rowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingVertical: 11,
  borderBottomWidth: 1,
  borderBottomColor: color.lineSoft,
} as const;
const inputStyle = {
  flex: 1,
  minWidth: 0,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: color.line,
  backgroundColor: color.bg,
  color: color.t1,
  fontFamily: 'Manrope_600SemiBold',
  fontSize: 13,
} as const;
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 24, marginHorizontal: 16 }}>
      <Text style={[overline, { color: color.t3, marginBottom: 10 }]}>{title}</Text>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 5,
          paddingBottom: 8,
          backgroundColor: color.surface2,
          borderWidth: 1,
          borderColor: color.lineSoft,
          borderRadius: 16,
        }}
      >
        {children}
      </View>
    </View>
  );
}
function Muted({ children }: { children: ReactNode }) {
  return (
    <Text style={text(600, { paddingVertical: 12, fontSize: 13, lineHeight: 20, color: color.t4 })}>
      {children}
    </Text>
  );
}
function Action({
  label,
  onPress,
  disabled,
  muted = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: muted ? 'transparent' : 'rgba(240,138,62,0.14)',
        opacity: pressed || disabled ? 0.5 : 1,
      })}
    >
      <Text style={text(800, { fontSize: 12, color: muted ? color.t4 : color.ember })}>
        {label}
      </Text>
    </Pressable>
  );
}
function Forgiveness({
  applied,
  busy,
  onApply,
  error,
}: {
  applied: boolean;
  busy: boolean;
  onApply: () => void;
  error: string | null;
}) {
  return (
    <View
      style={{
        marginTop: 16,
        marginHorizontal: 16,
        paddingVertical: 15,
        paddingHorizontal: 18,
        backgroundColor: color.surface2,
        borderWidth: 1,
        borderColor: color.lineSoft,
        borderRadius: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color.green }} />
        <View style={{ flex: 1 }}>
          <Text style={text(700, { fontSize: 14, color: color.t2 })}>Forgiveness token</Text>
          <Text style={text(600, { fontSize: 12, color: color.t4, marginTop: 2 })}>
            {applied ? 'Used this week.' : 'One per week. Protects one missed day.'}
          </Text>
        </View>
        {!applied && <Action label="Use" disabled={busy} onPress={onApply} muted />}
      </View>
      {error && (
        <Text style={text(600, { fontSize: 12, color: '#E4796B', marginTop: 8 })}>{error}</Text>
      )}
    </View>
  );
}
