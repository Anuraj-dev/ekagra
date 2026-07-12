import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoalMark } from '../components/GoalMark';
import { CheckIcon } from '../components/icons';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { useData } from '../data/DataProvider';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import type { RootNav } from '../nav/types';
import { color } from '../theme/tokens';
import { tabular, text } from '../theme/typography';

/** Morning Commit flow — save one to three tasks (the server contract's range). */
export function MorningCommit() {
  const nav = useNavigation<RootNav>();
  const insets = useSafeAreaInsets();
  const { tasks, goals, commitMorning } = useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);

  const candidates = useMemo(
    () => tasks.filter((t) => t.status === 'inbox' || t.status === 'planned'),
    [tasks],
  );
  const [selected, setSelected] = useState<string[]>(() =>
    tasks
      .filter((t) => t.status === 'planned')
      .map((t) => t.id)
      .slice(0, 3),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function commit() {
    setBusy(true);
    setError(null);
    try {
      await commitMorning(selected);
      nav.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not commit your plan.');
    } finally {
      setBusy(false);
    }
  }

  // The server contract requires 1–3 tasks; toggle() already caps the upper bound at 3.
  const canCommit = selected.length >= 1;

  return (
    <Screen scroll={false}>
      <ScreenHeader
        title="Morning Commit"
        sub="Pick 1–3. Small and true beats big and false."
        onBack={() => nav.goBack()}
        topInset={insets.top}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 24,
        }}
      >
        <Enter delay={60} style={{ gap: 10 }}>
          {candidates.length === 0 && (
            <Text
              style={text(600, {
                fontSize: 14,
                color: color.t3,
                paddingHorizontal: 4,
                lineHeight: 21,
              })}
            >
              Your inbox is empty. Add tasks from the Tasks tab first.
            </Text>
          )}
          {candidates.map((task) => {
            const checked = selected.includes(task.id);
            const gColor = goalColor(task.goalId, colorMap);
            const est = task.estimatedBlocks ?? 1;
            return (
              <Pressable
                key={task.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggle(task.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  backgroundColor: checked ? color.surface3 : color.surface,
                  borderWidth: 1,
                  borderColor: checked ? color.emberLine : color.line,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: checked ? color.ember : color.line,
                    backgroundColor: checked ? color.ember : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {checked && <CheckIcon tint={color.bg} size={12} />}
                </View>
                <View style={{ flex: 1 }}>
                  <GoalMark color={gColor} name={goalName(task.goalId, goals)} />
                  <Text style={text(700, { fontSize: 16, color: color.t1, marginTop: 6 })}>
                    {task.title}
                  </Text>
                </View>
                <Text style={[tabular, text(600, { fontSize: 12, color: color.t4 })]}>
                  {est} block{est === 1 ? '' : 's'}
                </Text>
              </Pressable>
            );
          })}
          {error && (
            <Text style={text(600, { fontSize: 13, color: color.danger, paddingHorizontal: 4 })}>
              {error}
            </Text>
          )}
        </Enter>
      </ScrollView>

      {/* Sticky commit */}
      <View
        style={{
          padding: 16,
          paddingBottom: 16 + insets.bottom,
          backgroundColor: color.bg,
          borderTopWidth: 1,
          borderTopColor: color.line,
        }}
      >
        <Pressable
          onPress={commit}
          disabled={!canCommit || busy}
          style={{
            borderRadius: 999,
            paddingVertical: 17,
            alignItems: 'center',
            backgroundColor: canCommit ? color.ember : color.lineSoft,
          }}
        >
          <Text style={text(800, { fontSize: 16, color: canCommit ? color.bg : color.t4 })}>
            {selected.length === 0
              ? 'Pick 1–3 tasks'
              : `Commit ${selected.length} task${selected.length === 1 ? '' : 's'}`}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
