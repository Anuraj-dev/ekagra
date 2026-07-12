import { useMemo, useState } from 'react';
import { GoalMark } from '../components/GoalMark';
import { ChevronLeftIcon } from '../components/icons';
import { CircleButton } from '../components/ui';
import { useData } from '../data/DataProvider';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { useNav } from '../nav/navigation';
import { color as tokens } from '../theme/tokens';

/** Morning Commit flow — save one to three tasks (the server contract's range). */
export function MorningCommit() {
  const { close } = useNav();
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
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not commit your plan.');
    } finally {
      setBusy(false);
    }
  }

  // The server contract requires 1–3 tasks; toggle() already caps the upper bound at 3.
  const canCommit = selected.length >= 1;

  return (
    <div className="app-frame">
      <div className="scroll" style={{ paddingBottom: 120 }}>
        <div
          className="enter"
          style={{ padding: '58px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <CircleButton aria-label="Back" onClick={close}>
            <ChevronLeftIcon />
          </CircleButton>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.3px' }}>
              Morning Commit
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3, marginTop: 3 }}>
              Pick 1–3. Small and true beats big and false.
            </div>
          </div>
        </div>

        <div
          className="enter-delay"
          style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '24px 16px 0' }}
        >
          {candidates.length === 0 && (
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: tokens.t3,
                padding: '0 4px',
                lineHeight: 1.5,
              }}
            >
              Your inbox is empty. Add tasks from the Tasks tab first.
            </p>
          )}
          {candidates.map((task) => {
            const checked = selected.includes(task.id);
            const gColor = goalColor(task.goalId, colorMap);
            const est = task.estimatedBlocks ?? 1;
            return (
              <label
                key={task.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: checked ? tokens.surface3 : tokens.surface,
                  border: `1px solid ${checked ? tokens.emberLine : tokens.line}`,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(task.id)}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: 1,
                    height: 1,
                    margin: 0,
                    pointerEvents: 'none',
                  }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    flex: 'none',
                    border: `1.5px solid ${checked ? tokens.ember : tokens.line}`,
                    background: checked ? tokens.ember : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {checked && (
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path
                        d="M2 6.5 L5 9 L10 3"
                        fill="none"
                        stroke="#0E0F12"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                <span style={{ flex: 1 }}>
                  <GoalMark color={gColor} name={goalName(task.goalId, goals)} />
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 700, marginTop: 6 }}>
                    {task.title}
                  </span>
                </span>
                <span
                  className="tabular"
                  style={{ fontSize: 12, fontWeight: 600, color: tokens.t4 }}
                >
                  {est} block{est === 1 ? '' : 's'}
                </span>
              </label>
            );
          })}
          {error && (
            <div style={{ fontSize: 13, fontWeight: 600, color: tokens.danger, padding: '0 4px' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Sticky commit */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          background: tokens.bg,
          borderTop: `1px solid ${tokens.line}`,
        }}
      >
        <button
          type="button"
          onClick={commit}
          disabled={!canCommit || busy}
          style={{
            width: '100%',
            borderRadius: 999,
            padding: 17,
            fontSize: 16,
            fontWeight: 800,
            background: canCommit ? tokens.ember : tokens.lineSoft,
            color: canCommit ? '#0E0F12' : tokens.t4,
          }}
        >
          {selected.length === 0
            ? 'Pick 1–3 tasks'
            : `Commit ${selected.length} task${selected.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
