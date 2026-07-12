import type { WeeklyReview } from '@ekagra/core';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useData } from '../data/DataProvider';
import { insightsApi } from '../lib/api';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { color as tokens, withAlpha } from '../theme/tokens';

type HeatCell = {
  dayOfWeek: number;
  hourOfDay: number;
  sessionCount: number;
  honestMinutes: number;
  earnedBlocks: number;
};
type Async<T> = { value: T | null; loading: boolean; error: boolean };
// Last-known section values survive tab-switch remounts so the screen shows the
// previous numbers while a refresh is in flight instead of flashing a
// loading/zero state.
const lastKnown = new Map<string, Map<string, unknown>>();
const initial = <T,>(userId: string, key: string): Async<T> => ({
  value: (lastKnown.get(userId)?.get(key) as T | undefined) ?? null,
  loading: !lastKnown.get(userId)?.has(key),
  error: false,
});

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
  const { session } = useAuth();
  return <InsightsScreen key={session?.user.id} userId={session?.user.id ?? ''} />;
}

function InsightsScreen({ userId }: { userId: string }) {
  const { tasks, goals, todayEarnedBlocks, todayHonestMinutes, earnedByTask, sessionEndVersion } =
    useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const planned = useMemo(() => tasks.filter((task) => task.status === 'planned'), [tasks]);
  const [reviews, setReviews] = useState<Async<WeeklyReview[]>>(initial(userId, 'reviews'));
  const [heatmap, setHeatmap] = useState<Async<HeatCell[]>>(initial(userId, 'heatmap'));
  const ticket = useRef(0);

  // Refetch the weekly review + heatmap on mount (each tab visit) and whenever a
  // session ends (sessionEndVersion), so the numbers stay consistent with the
  // live "Today" row. Sections keep their last-known values while a refresh is
  // in flight.
  useEffect(() => {
    const current = ++ticket.current;
    void sessionEndVersion;
    const run = <T,>(
      key: string,
      load: () => Promise<T>,
      set: (update: (prev: Async<T>) => Async<T>) => void,
    ) => {
      load()
        .then((value) => {
          if (current !== ticket.current) return;
          let cache = lastKnown.get(userId);
          if (!cache) {
            cache = new Map();
            lastKnown.set(userId, cache);
          }
          cache.set(key, value);
          set(() => ({ value, loading: false, error: false }));
        })
        .catch(
          () =>
            current === ticket.current &&
            set((prev) =>
              prev.value !== null ? prev : { value: null, loading: false, error: true },
            ),
        );
    };
    run('reviews', insightsApi.weeklyReview, setReviews);
    run('heatmap', insightsApi.focusHoursHeatmap, setHeatmap);
    return () => {
      ++ticket.current;
    };
  }, [sessionEndVersion, userId]);

  const currentWeek = reviews.value?.find((row) => row.weekStart === insightsApi.weekStart());

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
    <div className="scroll" style={{ paddingBottom: 24 }}>
      <div className="enter" style={{ padding: '58px 20px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.4px' }}>Insights</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3, marginTop: 8 }}>
          Honest numbers.
        </div>
      </div>
      <div className="enter-delay">
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              {estimateInsight ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3 }}>
                  {estimateInsight}
                </div>
              ) : null}
            </div>
          )}
        </Section>

        <Section>
          <div
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.line}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div className="overline" style={{ color: tokens.ember, marginBottom: 12 }}>
              This week
            </div>
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
          </div>
        </Section>
      </div>
    </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <Stat value={week.earnedBlocks} label="Earned blocks" />
        <Stat value={`${week.metDays}/${week.closedDays}`} label="Days met" />
        <Stat value={(week.honestMinutes / 60).toFixed(1)} label="Honest hours" />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3 }}>
        Today: {todayEarnedBlocks} blocks · {todayHonestMinutes} min
      </div>
      {suggestion ? (
        <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3 }}>{suggestion}</div>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="tabular" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.t3, marginTop: 8 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={{ padding: '24px 16px 0' }}>
      {title ? (
        <div className="overline" style={{ color: tokens.t3, marginBottom: 12 }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function Status({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 600, color: error ? tokens.ember : tokens.t4 }}>{text}</p>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        marginTop: 8,
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
      const iso = ((date.getDay() + 6) % 7) + 1; // 1=Mon..7=Sun
      const value = date > today ? 0 : (byDow.get(iso) ?? 0);
      return { date, value };
    });
    return { monthLabel, days };
  });
  const max = Math.max(...weeks.flatMap((week) => week.days.map((day) => day.value)), 1);

  return (
    <div
      role="img"
      aria-label="Earned blocks over the last 10 weeks"
      style={{ display: 'flex', gap: 4, maxWidth: 520 }}
    >
      {/* Weekday initials for orientation. */}
      <div style={{ display: 'grid', gridTemplateRows: '12px repeat(7, 12px)', gap: 4 }}>
        <span />
        {WEEKDAYS.map(([name, initial]) => (
          <span
            key={name}
            style={{ fontSize: 9, fontWeight: 700, color: tokens.t4, lineHeight: '12px' }}
          >
            {initial}
          </span>
        ))}
      </div>
      {weeks.map((week) => (
        <div
          key={week.days[0].date.toISOString()}
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateRows: '12px repeat(7, 12px)',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: tokens.t4,
              lineHeight: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            {week.monthLabel}
          </span>
          {week.days.map((day) => (
            <div
              key={day.date.toISOString()}
              title={`${day.date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}: ${day.value} blocks`}
              aria-label={`${day.date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}: ${day.value} blocks`}
              style={{
                borderRadius: 3,
                background:
                  day.value > 0
                    ? withAlpha(tokens.ember, 0.18 + 0.82 * (day.value / max))
                    : tokens.surface3,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
