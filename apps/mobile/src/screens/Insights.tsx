import type { WeeklyReview } from '@ekagra/core';
import { useFocusEffect } from '@react-navigation/native';
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { useData } from '../data/DataProvider';
import { insightsApi } from '../lib/api';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { color, radius, space, withAlpha } from '../theme/tokens';
import { overline, tabular, text } from '../theme/typography';

type HeatCell = {
  dayOfWeek: number;
  hourOfDay: number;
  sessionCount: number;
  honestMinutes: number;
  earnedBlocks: number;
};
type Async<T> = { value: T | null; loading: boolean; error: boolean };
const initial = <T,>(): Async<T> => ({ value: null, loading: true, error: false });

const WEEKS = 10;
const WEEKDAYS = [
  ['Mon', 'M'],
  ['Tue', 'T'],
  ['Wed', 'W'],
  ['Thu', 'T'],
  ['Fri', 'F'],
  ['Sat', 'S'],
  ['Sun', 'S'],
] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Insights() {
  const insets = useSafeAreaInsets();
  const { tasks, goals, todayEarnedBlocks, todayHonestMinutes, earnedByTask, sessionEndVersion } =
    useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const planned = useMemo(() => tasks.filter((task) => task.status === 'planned'), [tasks]);
  const [reviews, setReviews] = useState<Async<WeeklyReview[]>>(initial());
  const [heatmap, setHeatmap] = useState<Async<HeatCell[]>>(initial());
  // Refetch the weekly review + heatmap whenever the screen gains focus or a
  // session ends (sessionEndVersion), so the numbers stay consistent with the
  // live "Today" row. Stale in-flight responses are discarded, and each section
  // keeps its last-known value while a refresh is in flight.
  const ticket = useRef(0);
  const reload = useCallback(() => {
    const current = ++ticket.current;
    void sessionEndVersion;
    const run = <T,>(load: () => Promise<T>, set: (update: (prev: Async<T>) => Async<T>) => void) =>
      load()
        .then(
          (value) =>
            current === ticket.current && set(() => ({ value, loading: false, error: false })),
        )
        .catch(
          () =>
            current === ticket.current &&
            set((prev) =>
              prev.value !== null ? prev : { value: null, loading: false, error: true },
            ),
        );
    run(insightsApi.weeklyReview, setReviews);
    run(insightsApi.focusHoursHeatmap, setHeatmap);
  }, [sessionEndVersion]);
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const currentWeek = reviews.value?.find((row) => row.weekStart === insightsApi.weekStart());

  // Aggregate estimate vs actual across committed tasks into one honest ratio.
  const totals = planned.reduce(
    (acc, task) => {
      acc.est += task.estimatedBlocks ?? 1;
      acc.actual += earnedByTask[task.id] ?? 0;
      return acc;
    },
    { est: 0, actual: 0 },
  );
  const estimateInsight =
    totals.est > 0 && totals.actual > 0
      ? (() => {
          const pct = Math.round(((totals.est - totals.actual) / totals.est) * 100);
          if (pct > 0) return `You run ~${pct}% optimistic on estimates.`;
          if (pct < 0) return `You run ~${-pct}% under on estimates.`;
          return 'Estimates match actuals so far.';
        })()
      : null;

  return (
    <Screen>
      <Enter style={{ paddingTop: insets.top + space[4], paddingHorizontal: space[5] }}>
        <Text style={text(800, { fontSize: 26, letterSpacing: -0.4, color: color.t1 })}>
          Insights
        </Text>
        <Text style={text(600, { fontSize: 13, color: color.t3, marginTop: space[2] })}>
          Honest numbers.
        </Text>
      </Enter>
      <Enter delay={60}>
        <Section title="Earned blocks · 10 weeks">
          {heatmap.loading ? (
            <Status text="Loading…" />
          ) : heatmap.error ? (
            <Status text="Couldn’t load focus hours. Retry." error />
          ) : !heatmap.value?.length ? (
            <Status text="No focus-hour data yet." />
          ) : (
            <EarnedGrid rows={heatmap.value} />
          )}
        </Section>

        <Section title="Estimate vs actual">
          {planned.length === 0 ? (
            <Status text="Commit tasks to see estimates against earned blocks." />
          ) : (
            <View style={{ gap: space[4] }}>
              {planned.map((task) => {
                const est = task.estimatedBlocks ?? 1;
                const actual = earnedByTask[task.id] ?? 0;
                const max = Math.max(est, actual, 1);
                return (
                  <View key={task.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
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
                    <Bar value={est / max} fill={color.surface3} />
                    <Bar value={actual / max} fill={goalColor(task.goalId, colorMap)} />
                  </View>
                );
              })}
              {estimateInsight ? (
                <Text style={text(600, { fontSize: 13, color: color.t3 })}>{estimateInsight}</Text>
              ) : null}
            </View>
          )}
        </Section>

        <Section>
          <View style={styles.summary}>
            <Text style={[overline, { color: color.ember, marginBottom: space[3] }]}>
              This week
            </Text>
            {reviews.loading ? (
              <Status text="Loading this week…" />
            ) : reviews.error ? (
              <Status text="Couldn’t load weekly review. Retry." error />
            ) : !currentWeek ? (
              <Status text="No closed days yet this week." />
            ) : (
              <ThisWeek
                week={currentWeek}
                todayEarnedBlocks={todayEarnedBlocks}
                todayHonestMinutes={todayHonestMinutes}
              />
            )}
          </View>
        </Section>
      </Enter>
    </Screen>
  );
}

function ThisWeek({
  week,
  todayEarnedBlocks,
  todayHonestMinutes,
}: {
  week: WeeklyReview;
  todayEarnedBlocks: number;
  todayHonestMinutes: number;
}) {
  const optimistic =
    week.estimatedBlocks > 0 && week.actualBlocks > 0
      ? Math.round(((week.estimatedBlocks - week.actualBlocks) / week.estimatedBlocks) * 100)
      : null;
  const suggestion =
    optimistic !== null && optimistic > 15
      ? 'Running optimistic. Commit one block fewer next task.'
      : null;
  return (
    <View style={{ gap: space[4] }}>
      <View style={{ flexDirection: 'row', gap: space[6], flexWrap: 'wrap' }}>
        <Stat value={week.earnedBlocks} label="Earned blocks" />
        <Stat value={`${week.metDays}/${week.closedDays}`} label="Days met" />
        <Stat value={(week.honestMinutes / 60).toFixed(1)} label="Honest hours" />
      </View>
      <Text style={text(600, { fontSize: 13, color: color.t3 })}>
        Today: {todayEarnedBlocks} blocks · {todayHonestMinutes} min
      </Text>
      {suggestion ? (
        <Text style={text(600, { fontSize: 13, color: color.t3 })}>{suggestion}</Text>
      ) : null}
    </View>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View>
      <Text style={[tabular, text(800, { fontSize: 34, lineHeight: 36, color: color.t1 })]}>
        {value}
      </Text>
      <Text style={text(700, { fontSize: 12, color: color.t3, marginTop: space[2] })}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ paddingTop: space[6], paddingHorizontal: space[4] }}>
      {title ? (
        <Text style={[overline, { color: color.t3, marginBottom: space[3] }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

function Status({ text: label, error = false }: { text: string; error?: boolean }) {
  return (
    <Text style={text(600, { fontSize: 13, color: error ? color.ember : color.t4 })}>{label}</Text>
  );
}

function Bar({ value, fill }: { value: number; fill: string }) {
  return (
    <View style={styles.track}>
      <View
        style={{
          width: `${Math.round(Math.min(1, value) * 100)}%`,
          height: '100%',
          borderRadius: 4,
          backgroundColor: fill,
        }}
      />
    </View>
  );
}

/**
 * 10-week calendar grid (weeks × days) of earned blocks. Fill is a continuous
 * ember alpha ramp scaled by value/max. Per-day earned totals come from the
 * focus-hours heatmap aggregated across hours into a per-weekday value (the only
 * earned-block-by-day signal available client-side without a dated daily view).
 */
function EarnedGrid({ rows }: { rows: HeatCell[] }) {
  const byDow = new Map<number, number>();
  for (const row of rows) {
    byDow.set(row.dayOfWeek, (byDow.get(row.dayOfWeek) ?? 0) + row.earnedBlocks);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const offset = (start.getDay() + 6) % 7; // days since Monday
  start.setDate(start.getDate() - offset - (WEEKS - 1) * 7);

  let prevMonth = -1;
  const weeks = Array.from({ length: WEEKS }, (_, w) => {
    const first = new Date(start);
    first.setDate(start.getDate() + w * 7);
    const monthLabel = first.getMonth() !== prevMonth ? MONTHS[first.getMonth()] : '';
    prevMonth = first.getMonth();
    const days = Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const iso = (((date.getDay() + 6) % 7) + 1) as number; // 1=Mon..7=Sun
      const value = date > today ? 0 : (byDow.get(iso) ?? 0);
      return { date, value };
    });
    return { monthLabel, days };
  });
  const max = Math.max(...weeks.flatMap((week) => week.days.map((day) => day.value)), 1);

  return (
    <View accessible accessibilityLabel="Earned blocks over the last 10 weeks">
      <View style={{ flexDirection: 'row', gap: space[1] }}>
        {/* Weekday initials for orientation. */}
        <View style={{ gap: space[1], marginRight: space[1] }}>
          <Text style={styles.monthTick}> </Text>
          {WEEKDAYS.map(([name, initial]) => (
            <Text key={name} style={styles.dayInitial}>
              {initial}
            </Text>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week.days[0].date.toISOString()} style={{ flex: 1, gap: space[1] }}>
            <Text style={styles.monthTick} numberOfLines={1}>
              {week.monthLabel}
            </Text>
            {week.days.map((day) => (
              <View
                key={day.date.toISOString()}
                accessibilityLabel={`${day.date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}: ${day.value} blocks`}
                style={{
                  height: 12,
                  borderRadius: 3,
                  backgroundColor:
                    day.value > 0
                      ? withAlpha(color.ember, 0.18 + 0.82 * (day.value / max))
                      : color.surface3,
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = {
  summary: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: space[5],
  },
  track: {
    marginTop: space[2],
    height: 7,
    borderRadius: 4,
    backgroundColor: color.lineSoft,
    overflow: 'hidden' as const,
  },
  monthTick: {
    ...text(700, { fontSize: 9, color: color.t4 }),
    height: 12,
  },
  dayInitial: {
    ...text(700, { fontSize: 9, color: color.t4, textAlign: 'center' as const }),
    height: 12,
    lineHeight: 12,
  },
};
