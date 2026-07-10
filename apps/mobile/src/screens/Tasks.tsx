import type { Goal, Task } from '@ekagra/core';
import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { SectionRow } from '../components/ui';
import { useData } from '../data/DataProvider';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { color } from '../theme/tokens';
import { tabular, text } from '../theme/typography';

/**
 * Tasks / Inbox — quick capture with the Enter-saves-and-stays burst pattern:
 * submitting saves the task and keeps focus in the input for the next one.
 */
export function Tasks() {
  const insets = useSafeAreaInsets();
  const { tasks, goals, createTask, updateTask, deleteTask } = useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);

  const inbox = useMemo(() => tasks.filter((t) => t.status === 'inbox'), [tasks]);
  const grouped = useMemo(() => groupByGoal(inbox, goals), [inbox, goals]);

  const [title, setTitle] = useState('');
  const [captureGoalId, setCaptureGoalId] = useState<string | null>(goals[0]?.id ?? null);
  const [estimate, setEstimate] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  async function capture() {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createTask({ title: trimmed, goalId: captureGoalId, estimatedBlocks: estimate });
      setTitle('');
      // Burst pattern: Enter saves and stays.
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the task.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Enter style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <Text style={text(800, { fontSize: 26, letterSpacing: -0.4, color: color.t1 })}>Inbox</Text>
        <Text style={text(600, { fontSize: 13, color: color.t3, marginTop: 6 })}>
          {inbox.length} task{inbox.length === 1 ? '' : 's'} waiting
        </Text>
      </Enter>

      {/* Quick capture */}
      <Enter delay={60} style={{ paddingHorizontal: 16, paddingTop: 20 }}>
        <TextInput
          ref={inputRef}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={capture}
          blurOnSubmit={false}
          returnKeyType="done"
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="+ New task — Enter saves and stays"
          placeholderTextColor={color.t4}
          style={[
            text(500, {
              backgroundColor: color.surface,
              borderWidth: 1.5,
              borderColor: inputFocused ? color.ember : color.line,
              borderRadius: 12,
              padding: 16,
              color: color.t1,
              fontSize: 15,
            }),
          ]}
        />
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginTop: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {goals.map((goal) => {
            const active = captureGoalId === goal.id;
            const gColor = goalColor(goal.id, colorMap);
            return (
              <Pressable
                key={goal.id}
                onPress={() => setCaptureGoalId(active ? null : goal.id)}
                style={{
                  borderRadius: 999,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: active ? gColor : color.line,
                  backgroundColor: active ? color.surface3 : 'transparent',
                }}
              >
                <Text style={text(700, { fontSize: 12, color: active ? gColor : color.t4 })}>
                  {goal.title}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={text(600, { fontSize: 12, color: color.t4 })}>est</Text>
            {[1, 2, 3, 4].map((n) => {
              const active = estimate === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setEstimate(n)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: active ? 'rgba(240,138,62,0.45)' : color.line,
                    backgroundColor: active ? color.surface3 : 'transparent',
                  }}
                >
                  <Text
                    style={[
                      tabular,
                      text(700, { fontSize: 12, color: active ? color.ember : color.t4 }),
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {error && (
          <Text style={text(600, { fontSize: 13, color: '#E4796B', marginTop: 8 })}>{error}</Text>
        )}
      </Enter>

      {/* Grouped by goal */}
      <Enter delay={60}>
        {grouped.map(({ goalId, items }) => (
          <View key={goalId ?? 'unassigned'}>
            <SectionRow label={goalName(goalId, goals)} />
            <View style={{ gap: 10, paddingHorizontal: 16 }}>
              {items.map((task) => (
                <InboxRow
                  key={task.id}
                  task={task}
                  tint={goalColor(task.goalId, colorMap)}
                  goalTitle={goalName(task.goalId, goals)}
                  onCommit={() => void updateTask(task.id, { status: 'planned' })}
                  onDelete={() => void deleteTask(task.id)}
                />
              ))}
            </View>
          </View>
        ))}
        {inbox.length === 0 && (
          <Text
            style={text(600, {
              paddingVertical: 32,
              paddingHorizontal: 20,
              fontSize: 14,
              color: color.t4,
              lineHeight: 21,
            })}
          >
            Inbox zero. Capture the next task above.
          </Text>
        )}
      </Enter>
    </Screen>
  );
}

function InboxRow({
  task,
  tint,
  goalTitle,
  onCommit,
  onDelete,
}: {
  task: Task;
  tint: string;
  goalTitle: string;
  onCommit: () => void;
  onDelete: () => void;
}) {
  const est = task.estimatedBlocks ?? 1;
  return (
    <View
      style={{
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.line,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: tint }} />
        <Text style={text(700, { fontSize: 12, color: tint })}>{goalTitle}</Text>
        <Text style={[tabular, text(600, { marginLeft: 'auto', fontSize: 12, color: color.t4 })]}>
          est {est} block{est === 1 ? '' : 's'}
        </Text>
      </View>
      <Text style={text(700, { fontSize: 16, letterSpacing: -0.1, color: color.t1, marginTop: 9 })}>
        {task.title}
      </Text>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
        <Pressable onPress={onCommit}>
          <Text style={text(700, { fontSize: 13, color: color.ember })}>Commit to today</Text>
        </Pressable>
        <Pressable onPress={onDelete}>
          <Text style={text(700, { fontSize: 13, color: color.t4 })}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function groupByGoal(tasks: Task[], goals: Goal[]): { goalId: string | null; items: Task[] }[] {
  const order: (string | null)[] = [...goals.map((g) => g.id), null];
  return order
    .map((goalId) => ({ goalId, items: tasks.filter((t) => t.goalId === goalId) }))
    .filter((group) => group.items.length > 0);
}
