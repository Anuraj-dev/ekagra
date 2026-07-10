import type { DistractionTag } from '@ekagra/core';
import { DISTRACTION_TAGS, remainingMs } from '@ekagra/core';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, PauseIcon, ResumeGlyph } from '../components/icons';
import { TimerRing } from '../components/TimerRing';
import { useData } from '../data/DataProvider';
import { devicesApi } from '../lib/api';
import { blockLabel, formatClock } from '../lib/format';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { nudgeBlockComplete } from '../lib/notifications';
import { timerStateFromSession } from '../lib/timer';
import type { RootNav } from '../nav/types';
import { color } from '../theme/tokens';
import { overline, text } from '../theme/typography';

const TAG_COPY: Record<DistractionTag, string> = {
  distraction: 'Distraction',
  interruption: 'Interruption',
  'done-early': 'Done early',
  energy: 'Low energy',
};

export function Focus() {
  const nav = useNavigation<RootNav>();
  const insets = useSafeAreaInsets();
  const close = useCallback(() => nav.goBack(), [nav]);
  const {
    session,
    goals,
    tasks,
    sessionAnchorMs,
    serverClockOffset,
    sessionCommand,
    recordSessionEnd,
    reloadSession,
    earnedByTask,
  } = useData();

  const [nowMs, setNowMs] = useState(() => Date.now() + serverClockOffset);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [deskConnected, setDeskConnected] = useState(false);
  const completingRef = useRef(false);
  const flash = useSharedValue(1);

  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const task = session ? (tasks.find((t) => t.id === session.taskId) ?? null) : null;

  // Desk-light footer only renders when a paired device was recently seen (<120s).
  useEffect(() => {
    let active = true;
    devicesApi
      .list()
      .then((devices) => {
        if (!active) return;
        const connected = devices.some(
          (d) =>
            d.revoked_at === null &&
            d.last_seen_at !== null &&
            Date.now() - new Date(d.last_seen_at).getTime() < 120_000,
        );
        setDeskConnected(connected);
      })
      .catch(() => setDeskConnected(false));
    return () => {
      active = false;
    };
  }, []);

  // Local tick against the server-adjusted clock. Digits swap cleanly (no per-second animation).
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now() + serverClockOffset), 250);
    return () => clearInterval(id);
  }, [serverClockOffset]);

  const running = session?.status === 'running';
  const timerState = useMemo(
    () => (session ? timerStateFromSession(session, sessionAnchorMs) : null),
    [session, sessionAnchorMs],
  );

  const remaining = useMemo(() => {
    if (!timerState) return 0;
    const adjustedNow = Math.max(nowMs, timerState.lastObservedAt ?? nowMs);
    return remainingMs(timerState, adjustedNow);
  }, [timerState, nowMs]);

  const totalMs = (session?.plannedMinutes ?? 25) * 60_000;
  const progress = totalMs > 0 ? 1 - remaining / totalMs : 0;

  const complete = useCallback(async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    try {
      const ended = await sessionCommand({ action: 'complete' });
      recordSessionEnd(ended);
      setCelebrate(true);
      void nudgeBlockComplete();
      flash.value = withSequence(
        withTiming(1.04, { duration: 250, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 250, reduceMotion: ReduceMotion.System }),
      );
      setTimeout(() => close(), 2600);
    } catch {
      // If the server rejects (e.g. not yet zero), re-sync and let the tick retry.
      completingRef.current = false;
      await reloadSession();
    }
  }, [sessionCommand, recordSessionEnd, close, reloadSession, flash]);

  // Auto-complete when a running work block reaches zero.
  useEffect(() => {
    if (running && remaining <= 0 && !completingRef.current && session) {
      void complete();
    }
  }, [running, remaining, complete, session]);

  const flashStyle = useAnimatedStyle(() => ({ transform: [{ scale: flash.value }] }));

  if (!session) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color.bgFocus,
        }}
      >
        <Text style={text(600, { color: color.t3 })}>No active session.</Text>
        <Pressable onPress={close} style={{ marginTop: 12 }}>
          <Text style={text(700, { color: color.ember })}>Back to Today</Text>
        </Pressable>
      </View>
    );
  }

  const gColor = task ? goalColor(task.goalId, colorMap) : color.goalTan;
  const earned = task ? (earnedByTask[task.id] ?? 0) : 0;
  const total = task?.estimatedBlocks ?? 1;

  async function togglePause() {
    if (busy) return;
    setBusy(true);
    try {
      await sessionCommand({ action: running ? 'pause' : 'resume' });
    } finally {
      setBusy(false);
    }
  }

  async function endSession(tag: DistractionTag) {
    setBusy(true);
    try {
      const ended = await sessionCommand({ action: 'abandon', distractionTag: tag });
      recordSessionEnd(ended);
      close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bgFocus }}>
      {running && (
        // Vignette: solid low-opacity ember radial approximation (DESIGN-SPEC §11).
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: '50%',
            top: '32%',
            width: 600,
            height: 600,
            marginLeft: -300,
            marginTop: -300,
            borderRadius: 300,
            backgroundColor: 'rgba(240,138,62,0.05)',
          }}
        />
      )}

      <View style={{ flex: 1, alignItems: 'center', width: '100%' }}>
        {/* Top bar */}
        <View
          style={{
            width: '100%',
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            accessibilityLabel="Close focus"
            onPress={close}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              backgroundColor: color.surface,
              borderWidth: 1,
              borderColor: color.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeftIcon tint={color.t2} />
          </Pressable>
          <View style={{ alignItems: 'center', gap: 6 }}>
            {running ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: color.ember }}
                />
                <Text style={[overline, { color: color.t2 }]}>Focus</Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: color.surface,
                  borderWidth: 1,
                  borderColor: color.line,
                  borderRadius: 999,
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                }}
              >
                <View
                  style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: color.ember }}
                />
                <Text style={[overline, { color: color.ember }]}>Paused</Text>
              </View>
            )}
            <Text style={[overline, { fontSize: 11, letterSpacing: 1.2, color: color.t4 }]}>
              {blockLabel(earned + 1, total)}
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Ring */}
        <Animated.View style={flashStyle}>
          <TimerRing
            progress={progress}
            status={running ? 'running' : 'paused'}
            phase="work"
            timeLabel={formatClock(Math.ceil(remaining / 1000))}
            subLabel={running ? 'Remaining' : 'Paused'}
          />
        </Animated.View>

        {/* Bound task */}
        {task && (
          <View
            style={{ marginTop: 38, width: '100%', paddingHorizontal: 40, alignItems: 'center' }}
          >
            <Text
              style={text(800, {
                fontSize: 20,
                letterSpacing: -0.2,
                textAlign: 'center',
                color: running ? color.t1 : color.t2,
              })}
            >
              {task.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: gColor }} />
              <Text style={text(700, { fontSize: 12, color: gColor })}>
                {goalName(task.goalId, goals)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 14 }}>
              {Array.from({ length: total }, (_, i) => (
                <View
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count focus block segments, never reordered
                  key={`fseg-${total}-${i}`}
                  style={{
                    width: 26,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      i < earned ? (running ? gColor : 'rgba(196,143,191,0.45)') : color.lineSoft,
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={{ alignItems: 'center', gap: 22, marginBottom: 46 + insets.bottom }}>
        <Pressable
          accessibilityLabel={running ? 'Pause timer' : 'Resume timer'}
          onPress={togglePause}
          disabled={busy}
          style={
            running
              ? {
                  width: 76,
                  height: 76,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(14,15,18,0.2)',
                  borderWidth: 1.5,
                  borderColor: color.line,
                }
              : {
                  width: 76,
                  height: 76,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: color.ember,
                  borderWidth: 1,
                  borderColor: 'rgba(255,178,94,0.34)',
                  shadowColor: color.ember,
                  shadowOpacity: 0.3,
                  shadowRadius: 15,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: 8,
                }
          }
        >
          {running ? <PauseIcon /> : <ResumeGlyph />}
        </Pressable>
        <Pressable onPress={() => setEnding(true)}>
          <Text
            style={text(700, { fontSize: running ? 13 : 14, color: running ? color.t4 : color.t3 })}
          >
            End session — minutes are kept
          </Text>
        </Pressable>
      </View>

      {deskConnected && (
        <View
          style={{
            position: 'absolute',
            bottom: 20 + insets.bottom,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <Text style={text(600, { fontSize: 11, color: color.t5 })}>
            {running ? 'Desk light mirrors this timer' : 'Paused · desk light dimmed'}
          </Text>
        </View>
      )}

      {celebrate && <EarnedToast bottom={140 + insets.bottom} />}
      {ending && (
        <EndSheet
          onCancel={() => setEnding(false)}
          onPick={(tag) => {
            setEnding(false);
            void endSession(tag);
          }}
        />
      )}
    </View>
  );
}

function EarnedToast({ bottom }: { bottom: number }) {
  return (
    <View
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom,
        backgroundColor: 'rgba(91,191,138,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(91,191,138,0.40)',
        borderRadius: 999,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: 'center',
      }}
    >
      <Text style={text(700, { fontSize: 13, color: color.green })}>Block earned. Banked.</Text>
    </View>
  );
}

function EndSheet({
  onCancel,
  onPick,
}: {
  onCancel: () => void;
  onPick: (tag: DistractionTag) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
      }}
    >
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={onCancel}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7,8,10,0.6)',
        }}
      />
      <View
        style={{
          backgroundColor: color.surface,
          borderTopWidth: 1,
          borderTopColor: color.line,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 22,
          paddingHorizontal: 20,
          paddingBottom: 32 + insets.bottom,
        }}
      >
        <Text style={[overline, { color: color.t3 }]}>What ended it?</Text>
        <Text style={text(600, { fontSize: 13, color: color.t4, marginTop: 6 })}>
          Minutes are kept either way.
        </Text>
        <View style={{ gap: 8, marginTop: 16 }}>
          {DISTRACTION_TAGS.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => onPick(tag)}
              style={{
                backgroundColor: color.surface2,
                borderWidth: 1,
                borderColor: color.lineSoft,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
            >
              <Text style={text(700, { fontSize: 15, color: color.t2 })}>{TAG_COPY[tag]}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
