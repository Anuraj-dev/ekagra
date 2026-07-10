import type { DayRecord } from '@ekagra/core';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { useData } from '../data/DataProvider';
import { dayRecordsApi } from '../lib/api';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { color } from '../theme/tokens';
import { overline, tabular, text } from '../theme/typography';

/** "Mon Jul 10" from a `YYYY-MM-DD` record date. */
function formatRecordDate(recordDate: string): string {
  const d = new Date(`${recordDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return recordDate;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function prettyTag(tag: string): string {
  return tag.replace(/-/g, ' ');
}

/**
 * Insights — honest numbers. Core-loop counters come from this app session;
 * historical aggregates (10-week heat grid) need a reporting endpoint that
 * Phase 2 does not expose to the client yet, so that section states the fact.
 */
export function Insights() {
  const insets = useSafeAreaInsets();
  const { tasks, goals, todayEarnedBlocks, todayHonestMinutes, earnedByTask } = useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const planned = useMemo(() => tasks.filter((t) => t.status === 'planned'), [tasks]);
  const [history, setHistory] = useState<DayRecord[] | null>(null);

  useEffect(() => {
    let active = true;
    dayRecordsApi
      .recent()
      .then((rows) => {
        if (active) setHistory(rows);
      })
      .catch(() => {
        if (active) setHistory([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Only closed days carry a plan-vs-actual verdict.
  const closedDays = useMemo(() => (history ?? []).filter((r) => r.planMatch !== null), [history]);

  return (
    <Screen>
      <Enter style={{ paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <Text style={text(800, { fontSize: 26, letterSpacing: -0.4, color: color.t1 })}>
          Insights
        </Text>
        <Text style={text(600, { fontSize: 13, color: color.t3, marginTop: 6 })}>
          Honest numbers.
        </Text>
      </Enter>

      <Enter delay={60}>
        {/* This week / today summary */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <View
            style={{
              backgroundColor: color.surface,
              borderWidth: 1,
              borderColor: color.line,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <Text style={[overline, { color: color.ember }]}>Today</Text>
            <View style={{ flexDirection: 'row', gap: 24, marginTop: 14 }}>
              <Fact value={todayEarnedBlocks} label="Blocks earned" />
              <Fact value={todayHonestMinutes} label="Honest minutes" />
              <Fact value={planned.length} label="Tasks committed" />
            </View>
          </View>
        </View>

        {/* Estimate vs actual — twin bars per committed task */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[overline, { color: color.t3, marginBottom: 12 }]}>Estimate vs actual</Text>
          {planned.length === 0 ? (
            <Text style={text(600, { fontSize: 13, color: color.t4 })}>
              Commit tasks to see estimates against earned blocks.
            </Text>
          ) : (
            <View style={{ gap: 14 }}>
              {planned.map((task) => {
                const est = task.estimatedBlocks ?? 1;
                const actual = earnedByTask[task.id] ?? 0;
                const gColor = goalColor(task.goalId, colorMap);
                const max = Math.max(est, actual, 1);
                return (
                  <View key={task.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text
                        numberOfLines={1}
                        style={text(700, { fontSize: 13, color: color.t2, flex: 1 })}
                      >
                        {task.title}
                      </Text>
                      <Text style={[tabular, text(600, { fontSize: 12, color: color.t4 })]}>
                        {actual} / est {est} · {goalName(task.goalId, goals)}
                      </Text>
                    </View>
                    {/* estimate ghost track */}
                    <Bar value={est / max} color={color.surface3} />
                    {/* actual filled goal-color */}
                    <Bar value={actual / max} color={gColor} />
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Plan vs actual — closed-day history from day records */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[overline, { color: color.t3, marginBottom: 12 }]}>Plan vs actual</Text>
          {history === null ? (
            <Text style={text(600, { fontSize: 13, color: color.t4 })}>Loading recent days…</Text>
          ) : closedDays.length === 0 ? (
            <Text style={text(600, { fontSize: 13, color: color.t4 })}>
              Close a day to start building your plan-vs-actual history.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {closedDays.map((day) => (
                <View
                  key={day.recordDate}
                  style={{
                    backgroundColor: color.surface2,
                    borderWidth: 1,
                    borderColor: color.lineSoft,
                    borderRadius: 16,
                    paddingVertical: 13,
                    paddingHorizontal: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={text(700, { fontSize: 14, color: color.t2 })}>
                      {formatRecordDate(day.recordDate)}
                    </Text>
                    {day.wentWrongTag && day.wentWrongTag !== 'on-plan' && (
                      <Text style={text(600, { fontSize: 12, color: color.t4, marginTop: 2 })}>
                        {prettyTag(day.wentWrongTag)}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={text(700, {
                      fontSize: 12,
                      color: day.planMatch ? color.green : color.ember,
                    })}
                  >
                    {day.planMatch ? 'On plan' : 'Off plan'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Enter>
    </Screen>
  );
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text
        style={[
          tabular,
          text(800, { fontSize: 34, letterSpacing: -0.5, lineHeight: 34, color: color.t1 }),
        ]}
      >
        {value}
      </Text>
      <Text style={text(700, { fontSize: 12, color: color.t3, marginTop: 8 })}>{label}</Text>
    </View>
  );
}

function Bar({ value, color: fill }: { value: number; color: string }) {
  return (
    <View
      style={{
        marginTop: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color.lineSoft,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.round(Math.min(1, value) * 100)}%`,
          height: '100%',
          borderRadius: 3,
          backgroundColor: fill,
        }}
      />
    </View>
  );
}
