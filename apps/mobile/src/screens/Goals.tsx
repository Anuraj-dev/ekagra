import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { useData } from '../data/DataProvider';
import { buildGoalColorMap, goalColor } from '../lib/goals';
import { color } from '../theme/tokens';
import { overline, tabular, text } from '../theme/typography';

/** Goals — goal cards with role overline and weekly-rate meters (session-local data for now). */
export function Goals() {
  const insets = useSafeAreaInsets();
  const { goals, tasks, earnedByTask, createGoal } = useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);

  return (
    <Screen>
      <Enter style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <Text style={text(800, { fontSize: 26, letterSpacing: -0.4, color: color.t1 })}>Goals</Text>
        <Text style={text(600, { fontSize: 13, color: color.t3, marginTop: 6 })}>
          What you're building, block by block
        </Text>
      </Enter>

      <Enter delay={60} style={{ gap: 10, paddingTop: 24, paddingHorizontal: 16 }}>
        {goals.length === 0 && (
          <Text
            style={text(600, {
              fontSize: 14,
              color: color.t4,
              lineHeight: 21,
              paddingHorizontal: 4,
            })}
          >
            No goals yet. Goals give tasks a color and a reason.
          </Text>
        )}
        <GoalComposer onCreate={createGoal} />
        {goals.map((goal) => {
          const gColor = goalColor(goal.id, colorMap);
          const goalTasks = tasks.filter((t) => t.goalId === goal.id);
          const weeklyBlocks = goalTasks.reduce((sum, t) => sum + (earnedByTask[t.id] ?? 0), 0);
          return (
            <View
              key={goal.id}
              style={{
                backgroundColor: color.surface,
                borderWidth: 1,
                borderColor: color.line,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: gColor }} />
                <Text style={[overline, { color: color.t4 }]}>{goal.identityRole}</Text>
                <Text
                  style={[
                    tabular,
                    text(700, { marginLeft: 'auto', fontSize: 13, color: color.t3 }),
                  ]}
                >
                  {weeklyBlocks} block{weeklyBlocks === 1 ? '' : 's'} this session
                </Text>
              </View>
              <Text
                style={text(800, {
                  fontSize: 18,
                  letterSpacing: -0.2,
                  color: color.t1,
                  marginTop: 8,
                })}
              >
                {goal.title}
              </Text>
              {goal.deadline && (
                <Text style={text(600, { fontSize: 12, color: color.t4, marginTop: 4 })}>
                  Deadline {goal.deadline}
                </Text>
              )}
              {/* Twin thin meters: 7-day (full) and 30-day (.45) — session-local data for now. */}
              <RateMeter color={gColor} value={Math.min(1, weeklyBlocks / 9)} opacity={1} />
              <RateMeter color={gColor} value={Math.min(1, weeklyBlocks / 20)} opacity={0.45} />
            </View>
          );
        })}
        {goals.length > 0 && (
          <Text
            style={text(600, {
              fontSize: 12,
              color: color.t5,
              paddingTop: 10,
              paddingHorizontal: 4,
              lineHeight: 18,
            })}
          >
            Rolling rates, not streaks. A slow week is data.
          </Text>
        )}
      </Enter>
    </Screen>
  );
}

/**
 * Inline create-goal flow: a "+ New goal" affordance that expands into a small
 * form (title + identity role), mirroring the quick-capture pattern on Tasks.
 */
function GoalComposer({
  onCreate,
}: {
  onCreate: (payload: { title: string; identityRole: string }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // React state updates are async — a synchronous lock is needed so
  // Enter + a fast button tap can't double-submit before `busy` re-renders.
  const submitting = useRef(false);

  const canSave = title.trim().length > 0 && role.trim().length > 0 && !busy;

  async function save() {
    if (!canSave || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await onCreate({ title: title.trim(), identityRole: role.trim() });
      setTitle('');
      setRole('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the goal.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => {
          setTitle('');
          setRole('');
          setError(null);
          setOpen(true);
        }}
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
          paddingVertical: 8,
          paddingHorizontal: 4,
        })}
      >
        <Text style={text(700, { fontSize: 13, color: color.ember })}>+ New goal</Text>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.line,
        borderRadius: 16,
        padding: 16,
        gap: 10,
      }}
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Goal — what are you building?"
        placeholderTextColor={color.t4}
        autoFocus
        style={composerInput}
      />
      <TextInput
        value={role}
        onChangeText={setRole}
        onSubmitEditing={() => void save()}
        returnKeyType="done"
        placeholder="Identity role — e.g. Engineer, Writer"
        placeholderTextColor={color.t4}
        style={composerInput}
      />
      {error && <Text style={text(600, { fontSize: 13, color: '#E4796B' })}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Pressable disabled={!canSave} onPress={() => void save()}>
          <Text style={text(700, { fontSize: 13, color: canSave ? color.ember : color.t4 })}>
            {busy ? 'Saving…' : 'Create goal'}
          </Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => {
            setOpen(false);
            setError(null);
          }}
          style={{ opacity: busy ? 0.5 : 1 }}
        >
          <Text style={text(700, { fontSize: 13, color: color.t4 })}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const composerInput = text(500, {
  backgroundColor: color.surface2,
  borderWidth: 1.5,
  borderColor: color.line,
  borderRadius: 12,
  padding: 14,
  color: color.t1,
  fontSize: 15,
});

function RateMeter({
  color: fill,
  value,
  opacity,
}: {
  color: string;
  value: number;
  opacity: number;
}) {
  return (
    <View
      style={{
        marginTop: 10,
        height: 4,
        borderRadius: 2,
        backgroundColor: color.lineSoft,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.round(value * 100)}%`,
          height: '100%',
          borderRadius: 2,
          backgroundColor: fill,
          opacity,
        }}
      />
    </View>
  );
}
