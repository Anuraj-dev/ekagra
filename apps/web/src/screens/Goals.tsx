import { useMemo } from 'react';
import { useData } from '../data/DataProvider';
import { buildGoalColorMap, goalColor } from '../lib/goals';
import { color as tokens } from '../theme/tokens';

/** Goals — goal cards with role overline and weekly-rate meters (session-local data for now). */
export function Goals() {
  const { goals, tasks, earnedByTask } = useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);

  return (
    <div className="scroll" style={{ paddingBottom: 24 }}>
      <div className="enter" style={{ padding: '58px 20px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.4px' }}>Goals</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3, marginTop: 6 }}>
          What you're building, block by block
        </div>
      </div>

      <div
        className="enter-delay"
        style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '24px 16px 0' }}
      >
        {goals.length === 0 && (
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: tokens.t4,
              lineHeight: 1.5,
              padding: '0 4px',
            }}
          >
            No goals yet. Goals give tasks a color and a reason.
          </p>
        )}
        {goals.map((goal) => {
          const gColor = goalColor(goal.id, colorMap);
          const goalTasks = tasks.filter((t) => t.goalId === goal.id);
          const weeklyBlocks = goalTasks.reduce((sum, t) => sum + (earnedByTask[t.id] ?? 0), 0);
          return (
            <div
              key={goal.id}
              style={{
                background: tokens.surface,
                border: `1px solid ${tokens.line}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 13, borderRadius: 2, background: gColor }} />
                <span className="overline" style={{ color: tokens.t4 }}>
                  {goal.identityRole}
                </span>
                <span
                  className="tabular"
                  style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: tokens.t3 }}
                >
                  {weeklyBlocks} block{weeklyBlocks === 1 ? '' : 's'} this session
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.2px', marginTop: 8 }}>
                {goal.title}
              </div>
              {goal.deadline && (
                <div style={{ fontSize: 12, fontWeight: 600, color: tokens.t4, marginTop: 4 }}>
                  Deadline {goal.deadline}
                </div>
              )}
              {/* Twin thin meters: 7-day (full) and 30-day (.45) — session-local data for now. */}
              <RateMeter color={gColor} value={Math.min(1, weeklyBlocks / 9)} opacity={1} />
              <RateMeter color={gColor} value={Math.min(1, weeklyBlocks / 20)} opacity={0.45} />
            </div>
          );
        })}
        {goals.length > 0 && (
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: tokens.t5,
              padding: '10px 4px 0',
              lineHeight: 1.5,
            }}
          >
            Rolling rates, not streaks. A slow week is data.
          </p>
        )}
      </div>
    </div>
  );
}

function RateMeter({ color, value, opacity }: { color: string; value: number; opacity: number }) {
  return (
    <div
      style={{
        marginTop: 10,
        height: 4,
        borderRadius: 2,
        background: tokens.lineSoft,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.round(value * 100)}%`,
          height: '100%',
          borderRadius: 2,
          background: color,
          opacity,
          transition: 'width .3s var(--ease)',
        }}
      />
    </div>
  );
}
