import { useMemo } from 'react';
import { useData } from '../data/DataProvider';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { color as tokens } from '../theme/tokens';

/**
 * Insights — honest numbers. Core-loop counters come from this app session;
 * historical aggregates (10-week heat grid) need a reporting endpoint that
 * Phase 2 does not expose to the web client yet, so that section states the fact.
 */
export function Insights() {
  const { tasks, goals, todayEarnedBlocks, todayHonestMinutes, earnedByTask } = useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const planned = useMemo(() => tasks.filter((t) => t.status === 'planned'), [tasks]);

  return (
    <div className="scroll" style={{ paddingBottom: 24 }}>
      <div className="enter" style={{ padding: '58px 20px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.4px' }}>Insights</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3, marginTop: 6 }}>
          Honest numbers.
        </div>
      </div>

      <div className="enter-delay">
        {/* This week / today summary */}
        <div style={{ padding: '24px 16px 0' }}>
          <div
            style={{
              background: tokens.surface,
              border: `1px solid ${tokens.line}`,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div className="overline" style={{ color: tokens.ember }}>
              Today
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
              <Fact value={todayEarnedBlocks} label="Blocks earned" />
              <Fact value={todayHonestMinutes} label="Honest minutes" />
              <Fact value={planned.length} label="Tasks committed" />
            </div>
          </div>
        </div>

        {/* Estimate vs actual — twin bars per committed task */}
        <div style={{ padding: '24px 16px 0' }}>
          <div className="overline" style={{ color: tokens.t3, marginBottom: 12 }}>
            Estimate vs actual
          </div>
          {planned.length === 0 ? (
            <p style={{ fontSize: 13, fontWeight: 600, color: tokens.t4 }}>
              Commit tasks to see estimates against earned blocks.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {planned.map((task) => {
                const est = task.estimatedBlocks ?? 1;
                const actual = earnedByTask[task.id] ?? 0;
                const gColor = goalColor(task.goalId, colorMap);
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
                    {/* estimate ghost track */}
                    <Bar value={est / max} color={tokens.surface3} />
                    {/* actual filled goal-color */}
                    <Bar value={actual / max} color={gColor} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History placeholder — factual, no fake data */}
        <div style={{ padding: '24px 16px 0' }}>
          <div
            style={{
              background: tokens.surface2,
              border: `1px solid ${tokens.lineSoft}`,
              borderRadius: 16,
              padding: '15px 18px',
            }}
          >
            <div className="overline" style={{ color: tokens.t3 }}>
              Earned blocks · 10 weeks
            </div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: tokens.t4,
                marginTop: 6,
                lineHeight: 1.5,
              }}
            >
              History arrives with the reporting endpoint. Counters above are live for this session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div
        className="tabular"
        style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.5px', lineHeight: 1 }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.t3, marginTop: 8 }}>{label}</div>
    </div>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        marginTop: 6,
        height: 6,
        borderRadius: 3,
        background: tokens.lineSoft,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.round(Math.min(1, value) * 100)}%`,
          height: '100%',
          borderRadius: 3,
          background: color,
        }}
      />
    </div>
  );
}
