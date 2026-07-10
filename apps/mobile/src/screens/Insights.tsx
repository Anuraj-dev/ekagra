import type { DayRecord, IdentityRoleHours, RitualCorrelation, WeeklyReview } from '@ekagra/core';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Enter } from '../components/motion';
import { Screen } from '../components/Screen';
import { useData } from '../data/DataProvider';
import { dayRecordsApi, insightsApi } from '../lib/api';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { color } from '../theme/tokens';
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
const pretty = (tag: string) => tag.replace(/-/g, ' ');
const signed = (value: number | null, suffix = '') =>
  value === null ? '' : ` · ${value > 0 ? '+' : ''}${value}${suffix}`;
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour));

export function Insights() {
  const insets = useSafeAreaInsets();
  const { tasks, goals, todayEarnedBlocks, todayHonestMinutes, earnedByTask } = useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const planned = useMemo(() => tasks.filter((task) => task.status === 'planned'), [tasks]);
  const [history, setHistory] = useState<DayRecord[] | null>(null);
  const [reviews, setReviews] = useState<Async<WeeklyReview[]>>(initial());
  const [roles, setRoles] = useState<Async<IdentityRoleHours[]>>(initial());
  const [distractions, setDistractions] = useState<
    Async<Awaited<ReturnType<typeof insightsApi.distractionBreakdown>>>
  >(initial());
  const [heatmap, setHeatmap] = useState<Async<HeatCell[]>>(initial());
  const [rituals, setRituals] = useState<Async<RitualCorrelation[]>>(initial());
  useEffect(() => {
    let active = true;
    const run = <T,>(load: () => Promise<T>, set: (state: Async<T>) => void) =>
      load()
        .then((value) => active && set({ value, loading: false, error: false }))
        .catch(() => active && set({ value: null, loading: false, error: true }));
    dayRecordsApi
      .recent()
      .then((rows) => active && setHistory(rows))
      .catch(() => active && setHistory([]));
    run(insightsApi.weeklyReview, setReviews);
    run(insightsApi.identityRoleHours, setRoles);
    run(insightsApi.distractionBreakdown, setDistractions);
    run(insightsApi.focusHoursHeatmap, setHeatmap);
    run(insightsApi.ritualCorrelations, setRituals);
    return () => {
      active = false;
    };
  }, []);
  const currentWeek = reviews.value?.find((row) => row.weekStart === insightsApi.weekStart());
  const previous = reviews.value?.find(
    (row) => row.weekStart === insightsApi.previousWeek(insightsApi.weekStart()),
  );
  const closedDays = (history ?? []).filter((row) => row.planMatch !== null);
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
        <Section title="Weekly review" accent>
          {reviews.loading ? (
            <Status text="Gathering this week’s story…" />
          ) : reviews.error ? (
            <Status text="Weekly review is taking a breather. Try again soon." error />
          ) : !currentWeek ? (
            <Status text="Your first week will take shape as you focus and close days." />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                [
                  'Days met',
                  `${currentWeek.metDays} / ${currentWeek.closedDays}`,
                  signed(currentWeek.metDays - (previous?.metDays ?? currentWeek.metDays)),
                ],
                [
                  'Earned blocks',
                  currentWeek.earnedBlocks,
                  signed(
                    currentWeek.earnedBlocks - (previous?.earnedBlocks ?? currentWeek.earnedBlocks),
                  ),
                ],
                [
                  'Honest hours',
                  (currentWeek.honestMinutes / 60).toFixed(1),
                  signed(
                    Number(
                      (
                        (currentWeek.honestMinutes -
                          (previous?.honestMinutes ?? currentWeek.honestMinutes)) /
                        60
                      ).toFixed(1),
                    ),
                    'h',
                  ),
                ],
                [
                  'Completed / abandoned',
                  `${currentWeek.completedSessions} / ${currentWeek.abandonedSessions}`,
                  '',
                ],
                [
                  'Estimate accuracy',
                  `${currentWeek.actualBlocks} / ${currentWeek.estimatedBlocks}`,
                  currentWeek.estimatedBlocks
                    ? `${Math.round((currentWeek.actualBlocks / currentWeek.estimatedBlocks) * 100)}% delivered`
                    : 'No estimates yet',
                ],
                [
                  'Top distraction',
                  currentWeek.topDistractionTag
                    ? pretty(currentWeek.topDistractionTag)
                    : 'None yet',
                  'Notice it, then return.',
                ],
              ].map(([label, value, detail]) => (
                <ReviewFact
                  key={String(label)}
                  label={String(label)}
                  value={value}
                  detail={String(detail)}
                />
              ))}
            </View>
          )}
        </Section>
        <Section title="Today">
          <View style={styles.card}>
            <Fact value={todayEarnedBlocks} label="Blocks earned" />
            <Fact value={todayHonestMinutes} label="Honest minutes" />
            <Fact value={planned.length} label="Tasks committed" />
          </View>
        </Section>
        <Section title="Hours per identity role">
          <AsyncBlock<IdentityRoleHours[]>
            state={roles}
            empty="Focus by identity role will appear here as you work this week."
          >
            {(rows) => (
              <Bars
                rows={rows.map((row) => ({
                  label: row.identityRole,
                  value: row.honestMinutes / 60,
                  suffix: `${(row.honestMinutes / 60).toFixed(1)}h · ${row.earnedBlocks} blocks`,
                }))}
                fill={color.ember}
              />
            )}
          </AsyncBlock>
        </Section>
        <Section title="Distraction breakdown">
          <AsyncBlock<Awaited<ReturnType<typeof insightsApi.distractionBreakdown>>>
            state={distractions}
            empty="No abandoned sessions this week. Keep protecting your focus."
          >
            {(rows) => (
              <Bars
                rows={rows.map((row) => ({
                  label: pretty(row.distractionTag),
                  value: row.honestMinutesLost,
                  suffix: `${row.abandonedSessions} abandoned · ${row.honestMinutesLost}m lost`,
                }))}
                fill={color.emberHi}
              />
            )}
          </AsyncBlock>
        </Section>
        <Section title="Best focus hours">
          <AsyncBlock<HeatCell[]>
            state={heatmap}
            empty="Your focus map will light up after a few sessions."
          >
            {(rows) => <Heatmap rows={rows} />}
          </AsyncBlock>
        </Section>
        <Section title="Ritual correlations">
          <AsyncBlock<RitualCorrelation[]>
            state={rituals}
            empty="Keep a few mornings and evenings consistent to reveal useful patterns."
          >
            {(rows) => {
              const useful = rows.filter((row) => row.daysWith >= 5 && row.daysWithout >= 5);
              return useful.length ? (
                <View style={{ gap: 10 }}>
                  {useful.map((row) => (
                    <View key={row.signal} style={styles.subcard}>
                      <Text style={text(800, { fontSize: 13, color: color.t2 })}>
                        {row.signal === 'morning_commit' ? 'Morning commit' : 'Evening close'}
                      </Text>
                      <Text style={text(600, { fontSize: 13, color: color.t3, marginTop: 5 })}>
                        Days with it average {row.avgBlocksWith.toFixed(1)} blocks vs{' '}
                        {row.avgBlocksWithout.toFixed(1)} without{' '}
                        <Text style={{ color: color.green }}>
                          ({row.lift >= 0 ? '+' : ''}
                          {row.lift.toFixed(1)} lift)
                        </Text>
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Status text="A little more consistency will make these patterns meaningful." />
              );
            }}
          </AsyncBlock>
        </Section>
        <Section title="Estimate vs actual">
          {planned.length === 0 ? (
            <Status text="Commit tasks to see estimates against earned blocks." />
          ) : (
            <View style={{ gap: 14 }}>
              {planned.map((task) => {
                const est = task.estimatedBlocks ?? 1;
                const actual = earnedByTask[task.id] ?? 0;
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
                    <Bar value={est / max} fill={color.surface3} />
                    <Bar value={actual / max} fill={goalColor(task.goalId, colorMap)} />
                  </View>
                );
              })}
            </View>
          )}
        </Section>
        <Section title="Plan vs actual">
          {history === null ? (
            <Status text="Loading recent days…" />
          ) : closedDays.length === 0 ? (
            <Status text="Close a day to start building your plan-vs-actual history." />
          ) : (
            <View style={{ gap: 8 }}>
              {closedDays.map((day) => (
                <View key={day.recordDate} style={styles.ledger}>
                  <View>
                    <Text style={text(700, { fontSize: 14, color: color.t2 })}>
                      {new Date(`${day.recordDate}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    {day.wentWrongTag && day.wentWrongTag !== 'on-plan' && (
                      <Text style={text(600, { fontSize: 12, color: color.t4, marginTop: 2 })}>
                        {pretty(day.wentWrongTag)}
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
        </Section>
      </Enter>
    </Screen>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
      <Text style={[overline, { color: accent ? color.ember : color.t3, marginBottom: 12 }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}
function Status({ text: label, error = false }: { text: string; error?: boolean }) {
  return <Text style={textStyle(error ? color.ember : color.t4)}>{label}</Text>;
}
function AsyncBlock<T extends unknown[]>({
  state,
  empty,
  children,
}: {
  state: Async<T>;
  empty: string;
  children: (value: T) => ReactNode;
}) {
  if (state.loading) return <Status text="Loading…" />;
  if (state.error) return <Status text="Couldn’t load this section right now." error />;
  if (!state.value?.length) return <Status text={empty} />;
  return <>{children(state.value)}</>;
}
function Fact({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text style={[tabular, text(800, { fontSize: 30, lineHeight: 32, color: color.t1 })]}>
        {value}
      </Text>
      <Text style={text(700, { fontSize: 12, color: color.t3, marginTop: 8 })}>{label}</Text>
    </View>
  );
}
function ReviewFact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <View style={styles.review}>
      <Text style={text(700, { fontSize: 10, letterSpacing: 1, color: color.t4 })}>
        {label.toUpperCase()}
      </Text>
      <Text style={[tabular, text(800, { fontSize: 21, color: color.t1, marginTop: 7 })]}>
        {value}
      </Text>
      <Text style={text(700, { fontSize: 11, color: color.t3, marginTop: 4 })}>{detail}</Text>
    </View>
  );
}
function Bars({
  rows,
  fill,
}: {
  rows: Array<{ label: string; value: number; suffix: string }>;
  fill: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row) => (
        <View key={row.label}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={text(700, { fontSize: 13, color: color.t2 })}>{row.label}</Text>
            <Text style={[tabular, text(600, { fontSize: 12, color: color.t4 })]}>
              {row.suffix}
            </Text>
          </View>
          <Bar value={row.value / max} fill={fill} />
        </View>
      ))}
    </View>
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
function Heatmap({ rows }: { rows: HeatCell[] }) {
  const max = Math.max(...rows.map((row) => row.earnedBlocks), 1);
  const values = new Map(
    rows.map((row) => [`${row.dayOfWeek}-${row.hourOfDay}`, row.earnedBlocks]),
  );
  // Columns flex to share the full row width so the grid fills the screen
  // instead of collapsing into a fixed-width strip on the left. maxWidth
  // caps cell growth on tablets. (Deferred: unifying mobile/web orientation.)
  return (
    <View style={{ flexDirection: 'row', gap: 3, width: '100%', maxWidth: 420 }}>
      {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day, index) => (
        <View key={day} style={{ flex: 1, gap: 3, alignItems: 'stretch' }}>
          <Text style={text(700, { fontSize: 9, color: color.t4, textAlign: 'center' })}>
            {day[0].toUpperCase()}
          </Text>
          {HOURS.map((hour) => {
            const value = values.get(`${index + 1}-${hour}`) ?? 0;
            return (
              <View
                key={hour}
                style={{
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: value
                    ? value / max > 0.5
                      ? color.ember
                      : color.emberDim
                    : color.surface3,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
const textStyle = (tint: string) => text(600, { fontSize: 13, color: tint });
const styles = {
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row' as const,
    gap: 20,
  },
  review: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: 14,
    padding: 12,
    width: '47%' as const,
  },
  subcard: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: 14,
    padding: 14,
  },
  ledger: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.lineSoft,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  track: {
    marginTop: 6,
    height: 7,
    borderRadius: 4,
    backgroundColor: color.lineSoft,
    overflow: 'hidden' as const,
  },
};
