import type { Friend } from '@ekagra/core';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  ApiError,
  forgivenessApi,
  friendsApi,
  leaderboardApi,
  type WeeklyLeaderboardRow,
} from '../lib/api';
import { color } from '../theme/tokens';
import { overline, tabular, text } from '../theme/typography';

export function Crew() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([friendsApi.list(), leaderboardApi.weekly()])
      .then(([f, l]) => {
        if (active) {
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
      <ScreenHeader
        title="Crew"
        sub="Weekly earned blocks. Totals only — tasks stay private."
        topInset={insets.top}
      />
      <Enter delay={60}>
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
            leaderboard.map((row, index) => {
              const isYou = row.userId === session?.user.id;
              const name = isYou ? 'You' : row.displayName || 'Crew member';
              const top = Math.max(1, ...leaderboard.map((r) => r.earnedBlocks));
              return (
                <View
                  key={row.userId}
                  style={[
                    rowStyle,
                    isYou && {
                      backgroundColor: color.emberWash,
                      borderWidth: 1,
                      borderColor: color.emberLine,
                      borderBottomColor: color.emberLine,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      marginHorizontal: -10,
                    },
                  ]}
                >
                  <Text
                    style={[
                      tabular,
                      text(800, { width: 22, color: isYou ? color.ember : color.t4 }),
                    ]}
                  >
                    {index + 1}
                  </Text>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      backgroundColor: color.surface3,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={text(800, { fontSize: 11, color: color.t2 })}>
                      {name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={text(700, { color: isYou ? color.t1 : color.t2 })}
                    >
                      {name}
                    </Text>
                    <View
                      style={{
                        marginTop: 5,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: color.surface3,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.round((row.earnedBlocks / top) * 100)}%`,
                          height: 3,
                          borderRadius: 2,
                          backgroundColor: isYou ? color.ember : color.t4,
                        }}
                      />
                    </View>
                  </View>
                  <Text style={[tabular, text(800, { fontSize: 20, color: color.t1 })]}>
                    {row.earnedBlocks}
                  </Text>
                </View>
              );
            })
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
              accessibilityLabel="Friend email"
              style={inputStyle}
            />
            <Action label="Invite" disabled={busy || !invite.trim()} onPress={inviteFriend} />
          </View>
          {friends === null ? (
            <Muted>Loading friends…</Muted>
          ) : friends.length === 0 ? (
            <Muted>Your Crew is empty. Invite someone by email.</Muted>
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
            <Text style={text(600, { fontSize: 12, color: color.danger, marginTop: 10 })}>
              {error}
            </Text>
          )}
        </Section>
      </Enter>
    </Screen>
  );
}
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        backgroundColor: muted ? 'transparent' : color.emberWash,
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
        <Text style={text(700, { flex: 1, fontSize: 13, color: color.t2 })}>
          {applied
            ? 'Forgiveness token · used this week.'
            : 'Forgiveness token · one per week, protects one missed day.'}
        </Text>
        {!applied && <Action label="Use" disabled={busy} onPress={onApply} muted />}
      </View>
      {error && (
        <Text style={text(600, { fontSize: 12, color: color.danger, marginTop: 8 })}>{error}</Text>
      )}
    </View>
  );
}
