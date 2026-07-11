import type { MotivationStatus } from '@ekagra/core';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { DayLedger } from '../components/DayLedger';
import { PlayIcon, SettingsIcon } from '../components/icons';
import { MotivationPanel, RateRings } from '../components/Motivation';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { TaskCard } from '../components/TaskCard';
import { CircleButton, GhostButton, SectionRow } from '../components/ui';
import { useData } from '../data/DataProvider';
import { motivationApi } from '../lib/api';
import { formatClock, formatLongDate, greeting } from '../lib/format';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import type { RootNav } from '../nav/types';
import { color } from '../theme/tokens';
import { overline, tabular, text } from '../theme/typography';

// Last-known motivation snapshot survives remounts so the rhythm rings show
// the previous value while a refresh is in flight instead of flickering
// through an empty/zero state.
const motivationCache = new Map<string, MotivationStatus>();

export function Today() {
  const nav = useNavigation<RootNav>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const {
    goals,
    tasks,
    todayEarnedBlocks,
    todayHonestMinutes,
    earnedByTask,
    startSession,
    session: activeSession,
    sessionEndVersion,
  } = useData();
  const userId = session?.user.id;

  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const committed = useMemo(() => tasks.filter((t) => t.status === 'planned'), [tasks]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motivation, setMotivation] = useState<{ userId: string; value: MotivationStatus } | null>(
    () => {
      const value = userId ? motivationCache.get(userId) : null;
      return userId && value ? { userId, value } : null;
    },
  );
  const ticket = useRef(0);

  const plannedBlocks = committed.reduce((sum, t) => sum + (t.estimatedBlocks ?? 1), 0);
  const selected = committed.find((t) => t.id === selectedId) ?? null;
  const name = (session?.user.user_metadata?.name as string | undefined) ?? '';
  const visibleMotivation = motivation && motivation.userId === userId ? motivation.value : null;
  const now = new Date();
  // Refresh the rhythm/motivation stats whenever the screen gains focus or a
  // session ends; failures keep the last-known value on screen.
  useFocusEffect(
    useCallback(() => {
      const current = ++ticket.current;
      void sessionEndVersion;
      if (!userId) {
        setMotivation(null);
        return;
      }
      motivationApi
        .status()
        .then((value) => {
          if (current !== ticket.current) return;
          motivationCache.set(userId, value);
          setMotivation({ userId, value });
        })
        .catch(() => undefined);
      return () => {
        ++ticket.current;
      };
    }, [sessionEndVersion, userId]),
  );

  async function start() {
    // Client-side hard-block: no owned planned task selected → cannot start.
    if (!selected || activeSession) return;
    setBusy(true);
    setError(null);
    try {
      await startSession(selected.id);
      nav.navigate('Focus');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the session.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Enter style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <View style={{ position: 'absolute', right: 20, top: insets.top + 14 }}>
          <CircleButton label="Settings" onPress={() => nav.navigate('Settings')}>
            <SettingsIcon />
          </CircleButton>
        </View>
        <Text style={[overline, { color: color.t4 }]}>{formatLongDate(now)}</Text>
        <Text
          style={text(800, { fontSize: 26, letterSpacing: -0.4, color: color.t1, marginTop: 8 })}
        >
          {greeting(now)}
          {name ? `, ${name}` : ''}
        </Text>
        <Text style={text(600, { fontSize: 13, color: color.t3, marginTop: 6, lineHeight: 19 })}>
          <Text style={text(800, { color: color.ember })}>{todayEarnedBlocks}</Text>
          {` of ${plannedBlocks} block${plannedBlocks === 1 ? '' : 's'} earned · ${todayHonestMinutes} honest minute${todayHonestMinutes === 1 ? '' : 's'}`}
        </Text>
      </Enter>

      <Enter delay={60}>
        {visibleMotivation && (
          <MotivationPanel
            status={visibleMotivation}
            onPlan={() => nav.navigate('MorningCommit')}
          />
        )}
        {visibleMotivation && (
          <View
            style={{
              marginTop: 18,
              marginHorizontal: 16,
              padding: 14,
              borderRadius: 16,
              backgroundColor: color.surface2,
              borderWidth: 1,
              borderColor: color.lineSoft,
            }}
          >
            <Text style={[overline, { color: color.t3, marginBottom: 10 }]}>Your rhythm</Text>
            <RateRings rates={visibleMotivation.rates} />
          </View>
        )}
        <DayLedger planned={plannedBlocks} earned={todayEarnedBlocks} />

        {committed.length === 0 ? (
          <EmptyCommit onCommit={() => nav.navigate('MorningCommit')} />
        ) : (
          <>
            <SectionRow
              label={`Committed · ${committed.length} task${committed.length === 1 ? '' : 's'}`}
              action={<GhostButton onPress={() => nav.navigate('MorningCommit')}>Edit</GhostButton>}
            />
            <View style={{ gap: 10, paddingHorizontal: 16 }}>
              {committed.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  goalColor={goalColor(task.goalId, colorMap)}
                  goalName={goalName(task.goalId, goals)}
                  earnedBlocks={earnedByTask[task.id] ?? 0}
                  selected={task.id === selectedId}
                  selectable
                  onPress={() => setSelectedId((current) => (current === task.id ? null : task.id))}
                />
              ))}
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
              <StartBar
                selectedTitle={selected?.title ?? null}
                disabled={!selected || busy || Boolean(activeSession)}
                onStart={start}
              />
              {error && (
                <Text
                  style={text(600, {
                    fontSize: 12,
                    color: color.danger,
                    marginTop: 8,
                    paddingLeft: 4,
                  })}
                >
                  {error}
                </Text>
              )}
            </View>

            <Pressable
              onPress={() => nav.navigate('EveningClose')}
              style={{
                marginHorizontal: 16,
                marginTop: 12,
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
              <View>
                <Text style={text(700, { fontSize: 14, color: color.t2 })}>Close the day</Text>
                <Text style={text(600, { fontSize: 12, color: color.t4, marginTop: 2 })}>
                  {todayHonestMinutes} honest minute{todayHonestMinutes === 1 ? '' : 's'} so far
                </Text>
              </View>
              <Text style={{ color: color.t4, fontSize: 18 }}>›</Text>
            </Pressable>
          </>
        )}
      </Enter>
    </Screen>
  );
}

function StartBar({
  selectedTitle,
  disabled,
  onStart,
}: {
  selectedTitle: string | null;
  disabled: boolean;
  onStart: () => void;
}) {
  if (!selectedTitle) {
    return (
      <View
        style={{
          borderRadius: 16,
          paddingVertical: 16,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          backgroundColor: color.surface2,
          borderWidth: 1,
          borderColor: color.lineSoft,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            backgroundColor: color.surface3,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PlayIcon fill={color.t4} />
        </View>
        <View>
          <Text style={text(800, { fontSize: 16, color: color.t3 })}>
            Select a task above to start
          </Text>
          <Text style={text(600, { fontSize: 12, color: color.t4, marginTop: 2 })}>
            Tap a committed task — a focus block always belongs to one
          </Text>
        </View>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onStart}
      disabled={disabled}
      style={{
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(240,138,62,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(240,138,62,0.45)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          backgroundColor: color.ember,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PlayIcon />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={text(800, { fontSize: 16, letterSpacing: -0.1, color: color.t1 })}>
          Start focus
        </Text>
        <Text style={text(600, { fontSize: 12, color: color.t3, marginTop: 2 })}>
          {selectedTitle}
        </Text>
      </View>
      <Text style={[tabular, text(800, { fontSize: 20, color: color.ember, letterSpacing: -0.5 })]}>
        {formatClock(25 * 60)}
      </Text>
    </Pressable>
  );
}

function EmptyCommit({ onCommit }: { onCommit: () => void }) {
  return (
    <View style={{ paddingVertical: 32, paddingHorizontal: 20 }}>
      <SectionRow label="No plan yet" />
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={text(600, { fontSize: 14, color: color.t3, lineHeight: 21 })}>
          Commit 1–3 tasks to start the day. You can't start a focus block without a plan.
        </Text>
        <Pressable
          onPress={onCommit}
          style={{
            marginTop: 16,
            borderRadius: 999,
            paddingVertical: 15,
            alignItems: 'center',
            backgroundColor: color.ember,
          }}
        >
          <Text style={text(800, { fontSize: 15, color: color.bg })}>Morning Commit</Text>
        </Pressable>
      </View>
    </View>
  );
}
