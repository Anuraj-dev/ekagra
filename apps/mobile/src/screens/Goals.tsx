import { useMemo } from 'react';
import { Text, View } from 'react-native';
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
  const { goals, tasks, earnedByTask } = useData();
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
