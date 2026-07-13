import type { Task } from '@ekagra/core';
import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon, PlayIcon } from '../components/icons';
import {
  useCompleteTask,
  useCurrentSession,
  useGoals,
  useStartSession,
  useTasks,
  useTimer,
} from '../data/hooks';
import type { RootNav } from '../nav/types';
import { useTheme } from '../theme/ThemeProvider';
import { display, mono, ui } from '../theme/typography';

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatRelativeDay(value: string): string | null {
  const completed = new Date(value);
  if (Number.isNaN(completed.getTime())) return null;

  const today = new Date();
  const difference = Math.round(
    (new Date(dateKey(today)).getTime() - new Date(dateKey(completed)).getTime()) / DAY_MS,
  );
  if (difference === 0) return 'today';
  if (difference === 1) return 'yesterday';
  if (difference > 1 && difference < 7) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(completed);
  }
  if (difference > 0) return `${difference}d ago`;
  if (difference === -1) return 'tomorrow';
  if (difference < -1) return `in ${Math.abs(difference)}d`;
  return 'today';
}

function taskMeta(task: Task): string | null {
  if (task.status === 'done' && task.completedAt) {
    const relative = formatRelativeDay(task.completedAt);
    return relative ? `completed ${relative}` : 'completed';
  }

  const blocks = task.estimatedBlocks ? `${task.estimatedBlocks} × 25 min` : null;
  if (task.scheduledFor || task.scheduledTime) {
    const time = task.scheduledTime?.slice(0, 5);
    return [time, blocks].filter(Boolean).join(' · ') || 'Scheduled';
  }
  return blocks;
}

export function Tasks() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootNav>();
  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();
  const { data: current } = useCurrentSession();
  const timer = useTimer();
  const start = useStartSession();
  const complete = useCompleteTask();
  const today = new Date();
  const todayKey = dateKey(today);
  const inbox = tasks.filter((task) => task.status === 'inbox');
  const planned = tasks.filter((task) => task.status === 'planned' || task.status === 'done');
  const scheduledToday = tasks.filter((task) => task.scheduledFor === todayKey).length;
  const activeTaskId = current.session?.taskId ?? null;
  const goalTitles = new Map(goals.map((goal) => [goal.id, goal.title]));
  const startTask = (id: string) => {
    start.mutate({ taskId: id });
    nav.getParent()?.navigate('Focus' as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 110,
        }}
      >
        <Text style={display(600, { color: t.ink, fontSize: 32, lineHeight: 38 })}>Tasks</Text>
        <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 4 })}>
          {formatDate(today)} · {inbox.length} in inbox · {scheduledToday} scheduled
        </Text>

        <Section title={`Inbox · ${inbox.length}`} t={t} />
        {inbox.length > 0 ? (
          inbox.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              goalTitle={task.goalId ? goalTitles.get(task.goalId) : undefined}
              t={t}
              onStart={() => startTask(task.id)}
              onComplete={() => complete.mutate(task.id)}
              pending={start.isPending || complete.isPending}
            />
          ))
        ) : (
          <EmptyState message="Inbox is clear." t={t} />
        )}
        {start.isError && (
          <Retry text="Couldn’t start session." onRetry={() => start.reset()} t={t} />
        )}
        {complete.isError && (
          <Retry text="Couldn’t complete task." onRetry={() => complete.reset()} t={t} />
        )}

        <Section title="Timeline" t={t} />
        <DayStrip tasks={tasks} today={today} t={t} />
        {planned.length > 0 ? (
          planned.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              running={task.id === activeTaskId}
              remainingTime={
                task.id === activeTaskId ? formatDuration(timer.remainingMs) : undefined
              }
              goalTitle={task.goalId ? goalTitles.get(task.goalId) : undefined}
              t={t}
              onStart={() => startTask(task.id)}
              onComplete={() => complete.mutate(task.id)}
              pending={start.isPending || complete.isPending}
            />
          ))
        ) : (
          <EmptyState message="No scheduled tasks yet." t={t} />
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, t }: { title: string; t: ReturnType<typeof useTheme> }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: 28,
        marginBottom: 8,
      }}
    >
      <Text
        style={ui(600, {
          color: t.textSecondary,
          fontSize: 11,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        })}
      >
        {title}
      </Text>
    </View>
  );
}

function EmptyState({ message, t }: { message: string; t: ReturnType<typeof useTheme> }) {
  return (
    <Text style={ui(400, { color: t.textSecondary, fontSize: 13, paddingVertical: 12 })}>
      {message}
    </Text>
  );
}

function TaskRow({
  task,
  goalTitle,
  running,
  remainingTime,
  t,
  onStart,
  onComplete,
  pending,
}: {
  task: Task;
  goalTitle?: string;
  running?: boolean;
  remainingTime?: string;
  t: ReturnType<typeof useTheme>;
  onStart: () => void;
  onComplete: () => void;
  pending: boolean;
}) {
  const done = task.status === 'done';
  const meta = taskMeta(task);
  const hasGoalAndMeta = Boolean(goalTitle && meta);
  return (
    <View
      style={{
        minHeight: 70,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: t.line,
        paddingVertical: 13,
        paddingLeft: running ? 14 : 0,
        borderLeftWidth: running ? 3 : 0,
        borderLeftColor: running ? t.ink : 'transparent',
        backgroundColor: running ? t.surfaceSunk : 'transparent',
        opacity: done ? 0.55 : 1,
      }}
    >
      <View style={{ width: 22, alignItems: 'center' }}>
        {done ? (
          <CheckIcon tint={t.textSecondary} />
        ) : (
          <PriorityDots priority={task.priority} t={t} />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text
          style={ui(running ? 600 : 400, {
            color: t.ink,
            fontSize: 15,
            textDecorationLine: done ? 'line-through' : 'none',
          })}
        >
          {task.title}
        </Text>
        {(goalTitle || meta) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
            {goalTitle && <GoalChip t={t}>{goalTitle}</GoalChip>}
            {meta && (
              <Text
                style={ui(400, {
                  color: t.textSecondary,
                  fontSize: 11,
                  marginLeft: hasGoalAndMeta ? 7 : 0,
                })}
              >
                {meta}
              </Text>
            )}
          </View>
        )}
      </View>
      {running ? (
        <Text
          accessibilityLabel={`${remainingTime ?? 'Time unavailable'} remaining`}
          style={mono({ color: t.ink, fontSize: 14 })}
        >
          {remainingTime ?? '—'}
        </Text>
      ) : (
        !done && (
          <Pressable
            accessibilityLabel="Start focus"
            accessibilityRole="button"
            onPress={onStart}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.65 : 1,
            })}
          >
            {pending ? (
              <Text style={ui(600, { color: t.textSecondary, fontSize: 11 })}>Starting…</Text>
            ) : (
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  borderWidth: 1.5,
                  borderColor: t.lineStrong,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PlayIcon size={14} fill={t.ink} />
              </View>
            )}
          </Pressable>
        )
      )}
      {!done && (
        <Pressable
          accessibilityLabel="Complete task"
          accessibilityRole="button"
          onPress={onComplete}
          hitSlop={8}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={ui(600, { color: t.textSecondary, fontSize: 10 })}>DONE</Text>
        </Pressable>
      )}
    </View>
  );
}

function PriorityDots({
  priority,
  t,
}: {
  priority?: string | null;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <View accessibilityLabel="Priority" style={{ flexDirection: 'row', gap: 2 }}>
      {['p1', 'p2', 'p3'].map((item) => (
        <View
          key={item}
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor:
              item === priority ? (item === 'p1' ? t.priHigh : t.priMid) : 'transparent',
            borderWidth: item === priority && item === 'p3' ? 1 : 0,
            borderColor: t.priMid,
          }}
        />
      ))}
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
      })}
    >
      {children}
    </Text>
  );
}

function Retry({
  text,
  onRetry,
  t,
}: {
  text: string;
  onRetry: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.dangerBg,
        borderWidth: 1,
        borderColor: t.dangerLine,
        padding: 10,
        marginTop: 8,
        borderRadius: t.radii.sm,
      }}
    >
      <Text style={ui(500, { color: t.dangerText, flex: 1, fontSize: 13 })}>{text}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Text style={ui(700, { color: t.dangerText, fontSize: 12 })}>RETRY</Text>
      </Pressable>
    </View>
  );
}

function DayStrip({
  tasks,
  today,
  t,
}: {
  tasks: Task[];
  today: Date;
  t: ReturnType<typeof useTheme>;
}) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() + (index - 3) * DAY_MS);
    const key = dateKey(date);
    return {
      date,
      key,
      count: tasks.filter((task) => task.scheduledFor === key).length,
    };
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
    >
      {days.map(({ date, key, count }) => {
        const selected = key === dateKey(today);
        const day = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
          .format(date)
          .toUpperCase();
        const dateNumber = date.getDate();
        return (
          <Pressable
            key={key}
            accessibilityLabel={`${day} ${dateNumber}, ${count === 0 ? 'no' : count} scheduled tasks${selected ? ', today' : ''}`}
            accessibilityRole="button"
            style={{
              width: 44,
              height: 70,
              borderRadius: 12,
              backgroundColor: selected ? t.ink : 'transparent',
              borderWidth: selected ? 0 : 1,
              borderColor: t.lineSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={ui(600, { color: selected ? t.canvas : t.textSecondary, fontSize: 10 })}>
              {day}
            </Text>
            <Text
              style={ui(600, {
                color: selected ? t.canvas : t.ink,
                fontSize: 17,
                marginVertical: 4,
              })}
            >
              {dateNumber}
            </Text>
            <Text
              style={ui(400, { color: selected ? t.inkOnDark : t.textSecondary, fontSize: 11 })}
            >
              {count === 0 ? '—' : count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
