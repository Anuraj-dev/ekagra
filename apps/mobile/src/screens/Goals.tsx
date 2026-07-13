import type { Goal, GoalCreateRequest } from '@ekagra/core';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCreateGoal,
  useDeleteGoal,
  useGoalDailyFocus,
  useGoals,
  useUpdateGoal,
} from '../data/hooks';
import { useTheme } from '../theme/ThemeProvider';
import { display, ui } from '../theme/typography';

type Theme = ReturnType<typeof useTheme>;
type Priority = NonNullable<Goal['priority']>;
type FeedbackPhase = 'pending' | 'success' | 'error';
type Feedback = { phase: FeedbackPhase; message: string; retry?: () => void };
type Mutation<T> = {
  mutate: (input: T) => void;
  isPending: boolean;
  isError: boolean;
  reset: () => void;
  retry?: () => void;
};

const PRIORITIES: Array<Priority | null> = [null, 'p1', 'p2', 'p3'];
export function Goals() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const goalsQuery = useGoals();
  const focusQuery = useGoalDailyFocus();
  const activeGoals = useMemo(
    () => goalsQuery.data.filter((goal) => goal.archivedAt === null),
    [goalsQuery.data],
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingHorizontal: 20,
          paddingBottom: 112 + insets.bottom,
        }}
      >
        <Text style={display(600, { color: t.ink, fontSize: 32, lineHeight: 38 })}>Goals</Text>
        <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 4 })}>
          {activeGoals.length === 0
            ? 'Make space for what matters next.'
            : `${activeGoals.length} active ${activeGoals.length === 1 ? 'goal' : 'goals'}`}
        </Text>

        {goalsQuery.isLoading && goalsQuery.data.length === 0 ? (
          <Status message="Loading goals…" t={t} />
        ) : goalsQuery.isError ? (
          <RetryBanner
            message="Couldn’t load goals."
            onRetry={() => void goalsQuery.refetch()}
            t={t}
          />
        ) : null}

        <View style={{ marginTop: 28 }}>
          <SectionLabel title="Planning desk" t={t} />
          <GoalComposer t={t} />
        </View>

        {focusQuery.isLoading && activeGoals.length > 0 && (
          <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 18 })}>
            Loading focus history…
          </Text>
        )}
        {focusQuery.isError && activeGoals.length > 0 && (
          <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 18 })}>
            Focus history is unavailable right now.
          </Text>
        )}

        <View style={{ gap: 12, marginTop: 12 }}>
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              rows={focusQuery.data.filter((row) => row.goalId === goal.id)}
              loading={focusQuery.isLoading}
              t={t}
            />
          ))}
        </View>

        {!goalsQuery.isLoading && !goalsQuery.isError && activeGoals.length === 0 && (
          <Text
            style={ui(400, { color: t.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 18 })}
          >
            No active goals yet. Create one when you know what you are building toward.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function GoalComposer({ t }: { t: Theme }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [identityRole, setIdentityRole] = useState('');
  const [priority, setPriority] = useState<Priority | null>(null);
  const mutation = useCreateGoal();
  const feedback = useMutationFeedback(mutation, {
    pending: 'Saving goal…',
    success: 'Goal created · appears in Goals.',
    error: 'Couldn’t create goal.',
  });

  useEffect(() => {
    if (feedback.value?.phase === 'success') {
      setTitle('');
      setIdentityRole('');
      setPriority(null);
      setOpen(false);
    }
  }, [feedback.value?.phase]);

  const canSave = title.trim().length > 0 && identityRole.trim().length > 0 && !mutation.isPending;

  if (!open) {
    return (
      <View>
        {feedback.value && <FeedbackLine feedback={feedback.value} t={t} />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a new goal"
          onPress={() => {
            feedback.clear();
            setOpen(true);
          }}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            alignSelf: 'flex-start',
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Text style={ui(600, { color: t.accent, fontSize: 14 })}>+ New goal</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{
        ...t.elevationNative.low,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.line,
        borderRadius: t.radii.card,
        padding: 18,
        gap: 14,
      }}
    >
      <Text style={ui(600, { color: t.textSecondary, fontSize: 11, letterSpacing: 1.1 })}>
        NEW GOAL
      </Text>
      <LabeledInput
        label="Goal title"
        value={title}
        onChangeText={setTitle}
        placeholder="What are you building?"
        autoFocus
        t={t}
      />
      <LabeledInput
        label="Identity role"
        value={identityRole}
        onChangeText={setIdentityRole}
        placeholder="e.g. Engineer, Writer"
        onSubmitEditing={() => {
          if (canSave) feedback.run(buildCreatePayload(title, identityRole, priority));
        }}
        returnKeyType="done"
        t={t}
      />
      <PriorityPicker value={priority} onChange={setPriority} t={t} />
      {feedback.value && <FeedbackLine feedback={feedback.value} t={t} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={() => feedback.run(buildCreatePayload(title, identityRole, priority))}
          style={({ pressed }) => ({
            minHeight: 44,
            flex: 1,
            borderRadius: t.radii.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canSave ? (pressed ? t.accentPressed : t.accent) : t.lineSoft,
          })}
        >
          <Text style={ui(600, { color: canSave ? t.inkOnDark : t.textSecondary, fontSize: 14 })}>
            {mutation.isPending ? 'Saving…' : 'Create goal'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={mutation.isPending}
          onPress={() => {
            feedback.clear();
            setOpen(false);
          }}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Text style={ui(600, { color: t.textSecondary, fontSize: 14 })}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GoalCard({
  goal,
  rows,
  loading,
  t,
}: {
  goal: Goal;
  rows: Array<{
    focusDate: string;
    honestMinutes: number;
    earnedBlocks: number;
    sessionsEnded: number;
  }>;
  loading: boolean;
  t: Theme;
}) {
  const [editing, setEditing] = useState(false);
  const totalBlocks = rows.reduce((sum, row) => sum + row.earnedBlocks, 0);
  const totalMinutes = rows.reduce((sum, row) => sum + row.honestMinutes, 0);
  const priority = goal.priority ? goal.priority.toUpperCase() : null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${goal.title}, ${goal.identityRole}. ${totalBlocks} earned blocks and ${totalMinutes} honest minutes in the last 7 days. Edit goal`}
        onPress={() => setEditing(true)}
        style={({ pressed }) => ({
          ...t.elevationNative.low,
          backgroundColor: pressed ? t.surfaceSunk : t.surface,
          borderWidth: 1,
          borderColor: pressed ? t.lineStrong : t.line,
          borderRadius: t.radii.card,
          padding: 18,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={display(600, { color: t.ink, fontSize: 20, lineHeight: 25, flex: 1 })}>
            {goal.title}
          </Text>
          {priority && (
            <Text style={ui(600, { color: t.textSecondary, fontSize: 11 })}>{priority}</Text>
          )}
        </View>
        <Text
          style={ui(600, {
            color: t.textSecondary,
            fontSize: 11,
            letterSpacing: 1.1,
            marginTop: 6,
          })}
        >
          {goal.identityRole}
        </Text>
        {goal.deadline && (
          <Text style={ui(400, { color: t.textSecondary, fontSize: 12, marginTop: 6 })}>
            Deadline {goal.deadline}
          </Text>
        )}
        <GoalFocusMeter rows={rows} loading={loading} t={t} />
      </Pressable>
      {editing && <GoalSheet goal={goal} onClose={() => setEditing(false)} t={t} />}
    </>
  );
}

function GoalFocusMeter({
  rows,
  loading,
  t,
}: {
  rows: Array<{
    focusDate: string;
    honestMinutes: number;
    earnedBlocks: number;
    sessionsEnded: number;
  }>;
  loading: boolean;
  t: Theme;
}) {
  if (loading) {
    return (
      <Text style={ui(400, { color: t.textSecondary, fontSize: 12, marginTop: 16 })}>Loading…</Text>
    );
  }

  const orderedRows = [...rows].sort((a, b) => a.focusDate.localeCompare(b.focusDate));
  const maxSessions = Math.max(...orderedRows.map((row) => row.sessionsEnded), 1);
  const totalBlocks = orderedRows.reduce((sum, row) => sum + row.earnedBlocks, 0);
  const totalMinutes = orderedRows.reduce((sum, row) => sum + row.honestMinutes, 0);
  const summary = `This week: ${totalBlocks} earned blocks, ${totalMinutes} honest minutes across 7 days`;

  return (
    <View accessible accessibilityLabel={summary} style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 32, gap: 6 }}>
        {orderedRows.map((row) => {
          const today = row.focusDate === utcDateKey(new Date());
          const barHeight =
            row.sessionsEnded === 0 ? 4 : 4 + (row.sessionsEnded / maxSessions) * 24;
          return (
            <View
              key={row.focusDate}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
            >
              <View
                style={{
                  width: '100%',
                  height: barHeight,
                  minHeight: 4,
                  borderRadius: t.radii.pill,
                  backgroundColor: row.sessionsEnded > 0 ? t.accent : t.lineSoft,
                  opacity: today ? 1 : 0.78,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {orderedRows.map((row) => (
          <Text
            key={row.focusDate}
            style={ui(500, {
              color: row.focusDate === utcDateKey(new Date()) ? t.ink : t.textSecondary,
              fontSize: 10,
              textAlign: 'center',
              flex: 1,
            })}
          >
            {weekday(row.focusDate)}
          </Text>
        ))}
      </View>
      <Text style={ui(400, { color: t.textSecondary, fontSize: 12, marginTop: 10 })}>
        {totalBlocks === 0 && totalMinutes === 0
          ? 'No focus logged yet · last 7 days'
          : `${totalBlocks} earned ${totalBlocks === 1 ? 'block' : 'blocks'} · ${totalMinutes} honest min · last 7 days`}
      </Text>
    </View>
  );
}

function GoalSheet({ goal, onClose, t }: { goal: Goal; onClose: () => void; t: Theme }) {
  const [title, setTitle] = useState(goal.title);
  const [identityRole, setIdentityRole] = useState(goal.identityRole);
  const [deadline, setDeadline] = useState(goal.deadline ?? '');
  const [priority, setPriority] = useState<Priority | null>(goal.priority ?? null);
  const update = useMutationFeedback(useUpdateGoal(), {
    pending: 'Saving changes…',
    success: 'Goal updated.',
    error: 'Couldn’t update goal.',
  });
  const remove = useMutationFeedback(useDeleteGoal(), {
    pending: 'Deleting goal…',
    success: 'Goal deleted. Tasks stay, but no longer have this goal.',
    error: 'Couldn’t delete goal.',
  });
  const trimmedDeadline = deadline.trim();
  const dirty =
    title.trim() !== goal.title ||
    identityRole.trim() !== goal.identityRole ||
    trimmedDeadline !== (goal.deadline ?? '') ||
    priority !== (goal.priority ?? null);
  const canSave =
    title.trim().length > 0 &&
    identityRole.trim().length > 0 &&
    dirty &&
    !update.mutation.isPending;

  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => closeIfIdle(onClose, update.mutation, remove.mutation)}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }} accessibilityViewIsModal>
        <Pressable
          accessibilityLabel="Dismiss edit goal"
          onPress={() => closeIfIdle(onClose, update.mutation, remove.mutation)}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: t.ink,
            opacity: 0.24,
          }}
        />
        <View
          style={{
            ...t.elevationNative.sheet,
            backgroundColor: t.surface,
            borderTopLeftRadius: t.radii.sheet,
            borderTopRightRadius: t.radii.sheet,
            paddingTop: 22,
            paddingHorizontal: 24,
            paddingBottom: 28,
            gap: 14,
          }}
        >
          <Text style={ui(600, { color: t.textSecondary, fontSize: 11, letterSpacing: 1.1 })}>
            EDIT GOAL
          </Text>
          <LabeledInput label="Goal title" value={title} onChangeText={setTitle} t={t} />
          <LabeledInput
            label="Identity role"
            value={identityRole}
            onChangeText={setIdentityRole}
            t={t}
          />
          <LabeledInput
            label="Deadline · optional"
            value={deadline}
            onChangeText={setDeadline}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            t={t}
          />
          <PriorityPicker value={priority} onChange={setPriority} t={t} />
          {update.value && <FeedbackLine feedback={update.value} t={t} />}
          {remove.value && <FeedbackLine feedback={remove.value} t={t} />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              disabled={!canSave}
              onPress={() =>
                update.run({
                  id: goal.id,
                  patch: {
                    title: title.trim(),
                    identityRole: identityRole.trim(),
                    deadline: trimmedDeadline.length > 0 ? trimmedDeadline : null,
                    priority,
                  },
                })
              }
              style={({ pressed }) => ({
                minHeight: 44,
                flex: 1,
                borderRadius: t.radii.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: canSave ? (pressed ? t.accentPressed : t.accent) : t.lineSoft,
              })}
            >
              <Text
                style={ui(600, { color: canSave ? t.inkOnDark : t.textSecondary, fontSize: 14 })}
              >
                {update.mutation.isPending ? 'Saving…' : 'Save changes'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={update.mutation.isPending || remove.mutation.isPending}
              onPress={onClose}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Text style={ui(600, { color: t.textSecondary, fontSize: 14 })}>Close</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={update.mutation.isPending || remove.mutation.isPending}
            onPress={() =>
              Alert.alert('Delete goal?', 'Tasks stay, but they will no longer have this goal.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => remove.run(goal.id) },
              ])
            }
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Text style={ui(600, { color: t.dangerText, fontSize: 13 })}>Delete goal</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function LabeledInput({
  label,
  t,
  ...props
}: { label: string; t: Theme } & ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui(600, { color: t.textSecondary, fontSize: 12 })}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={t.textPlaceholder}
        style={ui(400, {
          minHeight: 48,
          backgroundColor: t.surfaceSunk,
          borderWidth: 1,
          borderColor: t.lineInput,
          borderRadius: t.radii.sm,
          paddingHorizontal: 14,
          color: t.ink,
          fontSize: 15,
        })}
      />
    </View>
  );
}

function PriorityPicker({
  value,
  onChange,
  t,
}: {
  value: Priority | null;
  onChange: (value: Priority | null) => void;
  t: Theme;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={ui(600, { color: t.textSecondary, fontSize: 12 })}>Priority · optional</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {PRIORITIES.map((item) => {
          const selected = value === item;
          const label = item ? item.toUpperCase() : 'NONE';
          return (
            <Pressable
              key={item ?? 'none'}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} priority`}
              onPress={() => onChange(item)}
              style={({ pressed }) => ({
                minHeight: 44,
                minWidth: 54,
                paddingHorizontal: 10,
                borderRadius: t.radii.xs,
                borderWidth: selected ? 0 : 1,
                borderColor: t.lineStrong,
                backgroundColor: selected ? (pressed ? t.accentPressed : t.ink) : t.surface,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed && !selected ? 0.65 : 1,
              })}
            >
              <Text
                style={ui(600, { color: selected ? t.inkOnDark : t.textSecondary, fontSize: 11 })}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function useMutationFeedback<T>(mutation: Mutation<T>, messages: Record<FeedbackPhase, string>) {
  const [value, setValue] = useState<Feedback | null>(null);
  const lastInput = useRef<T | undefined>(undefined);
  const wasPending = useRef(false);

  const run = useCallback(
    (input: T) => {
      lastInput.current = input;
      wasPending.current = false;
      setValue({ phase: 'pending', message: messages.pending });
      mutation.reset();
      mutation.mutate(input);
    },
    [messages.pending, mutation.mutate, mutation.reset],
  );

  const retry = useCallback(() => {
    if (lastInput.current === undefined) return;
    wasPending.current = false;
    setValue({ phase: 'pending', message: messages.pending });
    if (mutation.retry) {
      mutation.retry();
    } else {
      run(lastInput.current);
    }
  }, [messages.pending, mutation.retry, run]);

  const clear = useCallback(() => {
    mutation.reset();
    setValue(null);
  }, [mutation.reset]);

  useEffect(() => {
    if (wasPending.current && !mutation.isPending && value?.phase === 'pending') {
      setValue(
        mutation.isError
          ? { phase: 'error', message: messages.error, retry }
          : { phase: 'success', message: messages.success },
      );
    }
    wasPending.current = mutation.isPending;
  }, [mutation.isError, mutation.isPending, messages.error, messages.success, retry, value?.phase]);

  return { value, run, retry, clear, mutation };
}

function FeedbackLine({ feedback, t }: { feedback: Feedback; t: Theme }) {
  const isError = feedback.phase === 'error';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isError ? t.dangerBg : t.surfaceSunk,
        borderWidth: 1,
        borderColor: isError ? t.dangerLine : t.line,
        borderRadius: t.radii.sm,
        paddingHorizontal: 12,
        marginVertical: 4,
      }}
    >
      <Text
        style={ui(500, {
          color: isError ? t.dangerText : t.textSecondary,
          flex: 1,
          fontSize: 13,
          lineHeight: 18,
        })}
      >
        {feedback.message}
      </Text>
      {feedback.retry && (
        <Pressable
          accessibilityRole="button"
          onPress={feedback.retry}
          style={({ pressed }) => ({
            minHeight: 44,
            justifyContent: 'center',
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Text style={ui(700, { color: t.dangerText, fontSize: 12, letterSpacing: 0.8 })}>
            RETRY
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function RetryBanner({ message, onRetry, t }: { message: string; onRetry: () => void; t: Theme }) {
  return <FeedbackLine feedback={{ phase: 'error', message, retry: onRetry }} t={t} />;
}

function SectionLabel({ title, t }: { title: string; t: Theme }) {
  return (
    <Text
      style={ui(600, {
        color: t.textSecondary,
        fontSize: 11,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        marginBottom: 8,
      })}
    >
      {title}
    </Text>
  );
}

function Status({ message, t }: { message: string; t: Theme }) {
  return (
    <Text style={ui(400, { color: t.textSecondary, fontSize: 13, marginTop: 28 })}>{message}</Text>
  );
}

function buildCreatePayload(
  title: string,
  identityRole: string,
  priority: Priority | null,
): GoalCreateRequest {
  return { title: title.trim(), identityRole: identityRole.trim(), priority };
}

function closeIfIdle(
  onClose: () => void,
  update: ReturnType<typeof useUpdateGoal>,
  remove: ReturnType<typeof useDeleteGoal>,
) {
  if (!update.isPending && !remove.isPending) onClose();
}

function utcDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function weekday(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
    .format(date)
    .slice(0, 2);
}
