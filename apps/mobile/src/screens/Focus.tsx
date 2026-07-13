import { useNavigation } from '@react-navigation/native';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PauseIcon, PlayIcon } from '../components/icons';
import { useCurrentSession, useGoals, useSessionCommand, useTasks, useTimer } from '../data/hooks';
import { APP_NAME } from '../lib/appName';
import type { RootNav } from '../nav/types';
import { useTheme } from '../theme/ThemeProvider';
import { display, mono, ui } from '../theme/typography';

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function accessibleDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const minuteLabel = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const secondLabel = `${seconds} second${seconds === 1 ? '' : 's'}`;
  return `${minuteLabel} ${secondLabel} remaining`;
}

export function Focus() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { data, isLoading } = useCurrentSession();
  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();
  const timer = useTimer();
  const command = useSessionCommand();
  const lastAction = useRef<'pause' | 'resume' | 'complete' | 'abandon' | null>(null);
  const session = data.session;
  const task = session ? tasks.find((item) => item.id === session.taskId) : undefined;
  const goal = task?.goalId ? goals.find((item) => item.id === task.goalId) : undefined;

  if (isLoading && !session) {
    return (
      <FocusMessage message="Checking for an active session…" t={t} onBack={() => nav.goBack()} />
    );
  }

  if (!session) {
    return <FocusMessage message="No active session." t={t} onBack={() => nav.goBack()} />;
  }

  const paused = timer.status === 'paused';
  const remaining = formatDuration(timer.remainingMs);
  const plannedMs = Math.max(1, session.plannedMinutes * 60 * 1000);
  const progress = Math.min(1, Math.max(0, timer.elapsedMs / plannedMs));
  const taskTitle = session.taskTitle ?? task?.title;
  const send = (action: 'pause' | 'resume' | 'complete' | 'abandon') => {
    if (command.isPending) return;
    lastAction.current = action;
    command.mutate({ action });
  };
  const retryCommand = () => {
    if (lastAction.current) command.mutate({ action: lastAction.current });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.canvas,
        alignItems: 'center',
        paddingTop: insets.top + 22,
        paddingHorizontal: 24,
      }}
    >
      <Text style={display(600, { color: t.textSecondary, fontSize: 16 })}>{APP_NAME}</Text>
      <Text
        style={ui(600, { color: t.textSecondary, fontSize: 11, letterSpacing: 2.4, marginTop: 38 })}
      >
        FOCUS
      </Text>
      <Text
        accessibilityLabel={accessibleDuration(timer.remainingMs)}
        style={mono({ color: t.ink, fontSize: 92, lineHeight: 100, marginTop: 20 })}
      >
        {remaining}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: paused ? t.textSecondary : t.ink,
            marginRight: 7,
          }}
        />
        <Text style={ui(500, { color: t.textSecondary, fontSize: 11 })}>
          {paused ? '[ Paused ]' : timer.status === 'running' ? 'Live' : 'Ready'}
        </Text>
      </View>
      <Text style={ui(400, { color: t.ink, fontSize: 15, marginTop: 40 })}>
        {taskTitle ?? 'Task title unavailable'}
      </Text>
      {goal && <GoalChip t={t}>{goal.title}</GoalChip>}
      <View
        style={{
          width: 280,
          height: 3,
          borderRadius: 3,
          backgroundColor: t.lineSoft,
          marginTop: 20,
        }}
      >
        <View
          style={{
            width: `${progress * 100}%`,
            height: 3,
            backgroundColor: t.ink,
            borderRadius: 3,
          }}
        />
      </View>
      <View
        accessibilityLabel="Current session progress"
        style={{ flexDirection: 'row', gap: 7, marginTop: 16 }}
      >
        <View
          style={{
            width: 11,
            height: 11,
            borderRadius: 3,
            backgroundColor: timer.remainingMs <= 0 ? t.ink : t.accent,
            borderWidth: timer.remainingMs <= 0 ? 0 : 1.5,
            borderColor: t.accent,
          }}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          width: '100%',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: t.line,
          marginTop: 34,
          paddingVertical: 14,
        }}
      >
        {['Today', 'Sessions', 'Streak'].map((label) => (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={ui(500, { color: t.textSecondary, fontSize: 11 })}>{label}</Text>
            <Text style={ui(600, { color: t.ink, fontSize: 13, marginTop: 5 })}>—</Text>
          </View>
        ))}
      </View>
      {paused && (
        <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 20 })}>
          Timer holds until you resume.
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 }}>
        <Text style={ui(600, { color: t.textSecondary, fontSize: 11, letterSpacing: 1 })}>
          EXTEND
        </Text>
        {['+1 min', '+5 min'].map((label) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            style={({ pressed }) => ({
              minHeight: 44,
              borderWidth: 1,
              borderColor: t.lineStrong,
              borderRadius: t.radii.pill,
              paddingHorizontal: 14,
              justifyContent: 'center',
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Text style={ui(600, { color: t.ink, fontSize: 13 })}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 26 }}>
        <Pressable
          accessibilityLabel="Abandon focus"
          accessibilityRole="button"
          accessibilityState={{ disabled: command.isPending }}
          disabled={command.isPending}
          onPress={() => send('abandon')}
          style={({ pressed }) => ({
            width: 52,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: command.isPending ? 0.45 : pressed ? 0.65 : 1,
          })}
        >
          <Text style={ui(600, { color: t.textSecondary, fontSize: 12 })}>ABANDON</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={paused ? 'Resume focus' : 'Pause focus'}
          accessibilityRole="button"
          accessibilityState={{ disabled: command.isPending }}
          disabled={command.isPending}
          onPress={() => send(paused ? 'resume' : 'pause')}
          style={({ pressed }) => [
            t.elevationNative.fabAccentHi,
            {
              width: 72,
              height: 72,
              borderRadius: t.radii.focusFab,
              backgroundColor: pressed ? t.accentPressed : t.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: command.isPending ? 0.75 : 1,
            },
          ]}
        >
          {command.isPending ? (
            <Text style={ui(600, { color: t.inkOnDark, fontSize: 12 })}>Updating…</Text>
          ) : paused ? (
            <PlayIcon size={24} fill={t.inkOnDark} />
          ) : (
            <PauseIcon tint={t.inkOnDark} />
          )}
        </Pressable>
        <Pressable
          accessibilityLabel="Complete focus"
          accessibilityRole="button"
          accessibilityState={{ disabled: command.isPending }}
          disabled={command.isPending}
          onPress={() => send('complete')}
          style={({ pressed }) => ({
            width: 52,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: command.isPending ? 0.45 : pressed ? 0.65 : 1,
          })}
        >
          <Text style={ui(600, { color: t.textSecondary, fontSize: 12 })}>DONE</Text>
        </Pressable>
      </View>
      {command.isError && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 14,
            backgroundColor: t.dangerBg,
            borderWidth: 1,
            borderColor: t.dangerLine,
            borderRadius: t.radii.sm,
            paddingHorizontal: 12,
          }}
        >
          <Text style={ui(600, { color: t.dangerText, fontSize: 13, flex: 1 })}>
            Couldn’t update session.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retryCommand}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Text style={ui(700, { color: t.dangerText, fontSize: 12 })}>RETRY</Text>
          </Pressable>
        </View>
      )}
      <Pressable
        onPress={() => nav.goBack()}
        accessibilityRole="button"
        style={{ marginTop: 16, minHeight: 44, justifyContent: 'center' }}
      >
        <Text style={ui(500, { color: t.textSecondary, fontSize: 13 })}>Back to Tasks</Text>
      </Pressable>
    </View>
  );
}

function GoalChip({ children, t }: { children: string; t: ReturnType<typeof useTheme> }) {
  return (
    <Text
      style={ui(500, {
        color: t.textSecondary,
        backgroundColor: t.surfaceSunk,
        borderWidth: 1,
        borderColor: t.lineInput,
        borderRadius: t.radii.pill,
        paddingHorizontal: 8,
        paddingVertical: 2,
        fontSize: 11,
        marginTop: 7,
      })}
    >
      {children}
    </Text>
  );
}

function FocusMessage({
  message,
  t,
  onBack,
}: {
  message: string;
  t: ReturnType<typeof useTheme>;
  onBack: () => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Text style={display(600, { color: t.ink, fontSize: 24, textAlign: 'center' })}>
        {message}
      </Text>
      <Text
        style={ui(400, {
          color: t.textSecondary,
          fontSize: 14,
          marginTop: 12,
          textAlign: 'center',
        })}
      >
        Start a task from Tasks to begin focus.
      </Text>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        style={{ minHeight: 44, justifyContent: 'center', marginTop: 16 }}
      >
        <Text style={ui(600, { color: t.accent, fontSize: 14 })}>Back to Tasks</Text>
      </Pressable>
    </View>
  );
}
