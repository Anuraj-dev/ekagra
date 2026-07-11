import type { DayRecord, IdentityRoleHours, RitualCorrelation, WeeklyReview } from '@ekagra/core';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useData } from '../data/DataProvider';
import { dayRecordsApi, insightsApi } from '../lib/api';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { color as tokens } from '../theme/tokens';

type HeatCell = {
  dayOfWeek: number;
  hourOfDay: number;
  sessionCount: number;
  honestMinutes: number;
  earnedBlocks: number;
};
type Async<T> = { value: T | null; loading: boolean; error: boolean };
// Last-known section values survive tab-switch remounts so the screen shows
// the previous numbers while a refresh is in flight instead of flashing a
// loading/zero state.
const lastKnown = new Map<string, unknown>();
const initial = <T,>(key: string): Async<T> => ({
  value: (lastKnown.get(key) as T | undefined) ?? null,
  loading: !lastKnown.has(key),
  error: false,
});
const pretty = (tag: string) => tag.replace(/-/g, ' ');
const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const delta = (now: number, before?: number) => (before === undefined ? null : now - before);
const signed = (value: number | null, suffix = '') =>
  value === null ? '' : ` · ${value > 0 ? '+' : ''}${value}${suffix}`;
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour));

export function Insights() {
  const { tasks, goals, todayEarnedBlocks, todayHonestMinutes, earnedByTask, sessionEndVersion } =
    useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const planned = useMemo(() => tasks.filter((task) => task.status === 'planned'), [tasks]);
  const [history, setHistory] = useState<DayRecord[] | null>(null);
  const [reviews, setReviews] = useState<Async<WeeklyReview[]>>(initial('reviews'));
  const [roles, setRoles] = useState<Async<IdentityRoleHours[]>>(initial('roles'));
  const [distractions, setDistractions] = useState<
    Async<Awaited<ReturnType<typeof insightsApi.distractionBreakdown>>>
  >(initial('distractions'));
  const [heatmap, setHeatmap] = useState<Async<HeatCell[]>>(initial('heatmap'));
  const [rituals, setRituals] = useState<Async<RitualCorrelation[]>>(initial('rituals'));

  // Refetch every view aggregate on mount (each tab visit) and whenever a
  // session ends (sessionEndVersion), so weekly counts and the distraction
  // breakdown stay consistent with the live "Today" row. Sections keep their
  // last-known values while a refresh is in flight.
  useEffect(() => {
    let active = true;
    void sessionEndVersion;
    const run = <T,>(
      key: string,
      load: () => Promise<T>,
      set: (update: (prev: Async<T>) => Async<T>) => void,
    ) => {
      load()
        .then((value) => {
          lastKnown.set(key, value);
          if (active) set(() => ({ value, loading: false, error: false }));
        })
        .catch(
          () =>
            active &&
            set((prev) =>
              prev.value !== null ? prev : { value: null, loading: false, error: true },
            ),
        );
    };
    dayRecordsApi
      .recent()
      .then((rows) => active && setHistory(rows))
      .catch(() => active && setHistory((prev) => prev ?? []));
    run('reviews', insightsApi.weeklyReview, setReviews);
    run('roles', insightsApi.identityRoleHours, setRoles);
    run('distractions', insightsApi.distractionBreakdown, setDistractions);
    run('heatmap', insightsApi.focusHoursHeatmap, setHeatmap);
    run('rituals', insightsApi.ritualCorrelations, setRituals);
    return () => {
      active = false;
    };
  }, [sessionEndVersion]);

  const currentWeek = reviews.value?.find((row) => row.weekStart === insightsApi.weekStart());
  const previous = reviews.value?.find(
    (row) => row.weekStart === insightsApi.previousWeek(insightsApi.weekStart()),
  );
  const closedDays = (history ?? []).filter((row) => row.planMatch !== null);

  return (
    <div className="scroll" style={{ paddingBottom: 24 }}>
      <div className="enter" style={{ padding: '58px 20px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.4px' }}>Insights</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3, marginTop: 6 }}>
          Honest numbers.
        </div>
      </div>
      <div className="enter-delay">
        <Section title="Weekly review" accent>
          {reviews.loading ? (
            <Status text="Gathering this week’s story…" />
          ) : reviews.error ? (
            <Status text="Weekly review is taking a breather. Try again soon." error />
          ) : !currentWeek ? (
            <Status text="Your first week will take shape as you focus and close days." />
          ) : (
            <div
              style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
            >
              <ReviewFact
                label="Days met"
                value={`${currentWeek.metDays} / ${currentWeek.closedDays}`}
                detail={signed(delta(currentWeek.metDays, previous?.metDays))}
              />
              <ReviewFact
                label="Earned blocks"
                value={currentWeek.earnedBlocks}
                detail={signed(delta(currentWeek.earnedBlocks, previous?.earnedBlocks))}
              />
              <ReviewFact
                label="Honest hours"
                value={(currentWeek.honestMinutes / 60).toFixed(1)}
                detail={signed(
                  delta(currentWeek.honestMinutes, previous?.honestMinutes) === null
                    ? null
                    : Number(
                        ((currentWeek.honestMinutes - (previous?.honestMinutes ?? 0)) / 60).toFixed(
                          1,
                        ),
                      ),
                  'h',
                )}
              />
              <ReviewFact
                label="Completed / abandoned"
                value={`${currentWeek.completedSessions} / ${currentWeek.abandonedSessions}`}
                detail={signed(delta(currentWeek.abandonedSessions, previous?.abandonedSessions))}
              />
              <ReviewFact
                label="Estimate accuracy"
                value={`${currentWeek.actualBlocks} / ${currentWeek.estimatedBlocks}`}
                detail={
                  currentWeek.estimatedBlocks
                    ? `${Math.round((currentWeek.actualBlocks / currentWeek.estimatedBlocks) * 100)}% delivered`
                    : 'No estimates yet'
                }
              />
              <ReviewFact
                label="Top distraction"
                value={
                  currentWeek.topDistractionTag ? pretty(currentWeek.topDistractionTag) : 'None yet'
                }
                detail="Notice it, then return."
              />
            </div>
          )}
        </Section>
        <Section title="Today">
          <div
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.line}`,
              borderRadius: 16,
              padding: 18,
              display: 'flex',
              gap: 24,
            }}
          >
            <Fact value={todayEarnedBlocks} label="Blocks earned" />
            <Fact value={todayHonestMinutes} label="Honest minutes" />
            <Fact value={planned.length} label="Tasks committed" />
          </div>
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
                color={tokens.ember}
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
                color={tokens.emberHi}
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
                <div style={{ display: 'grid', gap: 10 }}>
                  {useful.map((row) => (
                    <div
                      key={row.signal}
                      style={{
                        background: tokens.surface2,
                        border: `1px solid ${tokens.lineSoft}`,
                        borderRadius: 14,
                        padding: 14,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: tokens.t2 }}>
                        {row.signal === 'morning_commit' ? 'Morning commit' : 'Evening close'}
                      </div>
                      <div
                        style={{ fontSize: 13, fontWeight: 600, color: tokens.t3, marginTop: 5 }}
                      >
                        Days with it average {row.avgBlocksWith.toFixed(1)} blocks vs{' '}
                        {row.avgBlocksWithout.toFixed(1)} without{' '}
                        <span style={{ color: tokens.green }}>
                          ({row.lift >= 0 ? '+' : ''}
                          {row.lift.toFixed(1)} lift)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {planned.map((task) => {
                const est = task.estimatedBlocks ?? 1;
                const actual = earnedByTask[task.id] ?? 0;
                const max = Math.max(est, actual, 1);
                return (
                  <div key={task.id}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: tokens.t2,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {task.title}
                      </span>
                      <span
                        className="tabular"
                        style={{ fontSize: 12, fontWeight: 600, color: tokens.t4 }}
                      >
                        {actual} / est {est} · {goalName(task.goalId, goals)}
                      </span>
                    </div>
                    <Bar value={est / max} color={tokens.surface3} />
                    <Bar value={actual / max} color={goalColor(task.goalId, colorMap)} />
                  </div>
                );
              })}
            </div>
          )}
        </Section>
        <Section title="Plan vs actual">
          {history === null ? (
            <Status text="Loading recent days…" />
          ) : closedDays.length === 0 ? (
            <Status text="Close a day to start building your plan-vs-actual history." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {closedDays.map((day) => (
                <div
                  key={day.recordDate}
                  style={{
                    background: tokens.surface2,
                    border: `1px solid ${tokens.lineSoft}`,
                    borderRadius: 16,
                    padding: '13px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tokens.t2 }}>
                      {formatDate(day.recordDate)}
                    </div>
                    {day.wentWrongTag && day.wentWrongTag !== 'on-plan' && (
                      <div
                        style={{ fontSize: 12, fontWeight: 600, color: tokens.t4, marginTop: 2 }}
                      >
                        {pretty(day.wentWrongTag)}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: day.planMatch ? tokens.green : tokens.ember,
                    }}
                  >
                    {day.planMatch ? 'On plan' : 'Off plan'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: '24px 16px 0' }}>
      <div
        className="overline"
        style={{ color: accent ? tokens.ember : tokens.t3, marginBottom: 12 }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
function Status({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 600, color: error ? tokens.ember : tokens.t4 }}>{text}</p>
  );
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
    <div>
      <div className="tabular" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.t3, marginTop: 8 }}>{label}</div>
    </div>
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
    <div
      style={{
        background: tokens.surface2,
        border: `1px solid ${tokens.lineSoft}`,
        borderRadius: 14,
        padding: 13,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: tokens.t4,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div
        className="tabular"
        style={{ fontSize: 22, fontWeight: 800, color: tokens.t1, marginTop: 7 }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: tokens.t3, marginTop: 4 }}>{detail}</div>
    </div>
  );
}
function Bars({
  rows,
  color,
}: {
  rows: Array<{ label: string; value: number; suffix: string }>;
  color: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((row) => (
        <div key={row.label}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              fontSize: 13,
              fontWeight: 700,
              color: tokens.t2,
            }}
          >
            <span>{row.label}</span>
            <span className="tabular" style={{ color: tokens.t4 }}>
              {row.suffix}
            </span>
          </div>
          <Bar value={row.value / max} color={color} />
        </div>
      ))}
    </div>
  );
}
function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        marginTop: 6,
        height: 7,
        borderRadius: 4,
        background: tokens.lineSoft,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.round(Math.min(1, value) * 100)}%`,
          height: '100%',
          borderRadius: 4,
          background: color,
        }}
      />
    </div>
  );
}
function Heatmap({ rows }: { rows: HeatCell[] }) {
  const max = Math.max(...rows.map((row) => row.earnedBlocks), 1);
  const values = new Map(
    rows.map((row) => [`${row.dayOfWeek}-${row.hourOfDay}`, row.earnedBlocks]),
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '34px repeat(24, minmax(13px, 1fr))',
          gap: 3,
          minWidth: 420,
          // Cap stretch on very wide viewports so cells stay readable.
          maxWidth: 720,
        }}
      >
        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day, index) => (
          <Fragment key={day}>
            <div style={{ fontSize: 10, color: tokens.t4, alignSelf: 'center' }}>
              {day[0].toUpperCase()}
            </div>
            {HOURS.map((hour) => {
              const value = values.get(`${index + 1}-${hour}`) ?? 0;
              return (
                <div
                  key={hour}
                  title={`${day} ${hour}:00 · ${value} blocks`}
                  style={{
                    width: '100%',
                    minWidth: 13,
                    height: 13,
                    borderRadius: 3,
                    background: value
                      ? `color-mix(in srgb, ${tokens.ember} ${Math.max(20, Math.round((value / max) * 100))}%, ${tokens.surface3})`
                      : tokens.surface3,
                  }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
