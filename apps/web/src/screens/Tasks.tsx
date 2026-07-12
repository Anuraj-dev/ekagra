import type { Goal, Task } from '@ekagra/core';
import { type FormEvent, useMemo, useRef, useState } from 'react';
import { TaskCard } from '../components/TaskCard';
import { Chip, GhostButton, SectionRow } from '../components/ui';
import { useData } from '../data/DataProvider';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { color as tokens } from '../theme/tokens';

/**
 * Tasks / Inbox — quick capture with the Enter-saves-and-stays burst pattern:
 * submitting saves the task and keeps focus in the input for the next one.
 */
export function Tasks() {
  const { tasks, goals, createTask, updateTask, deleteTask } = useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);

  const inbox = useMemo(() => tasks.filter((t) => t.status === 'inbox'), [tasks]);
  const grouped = useMemo(() => groupByGoal(inbox, goals), [inbox, goals]);

  const [title, setTitle] = useState('');
  const [captureGoalId, setCaptureGoalId] = useState<string | null>(goals[0]?.id ?? null);
  const [estimate, setEstimate] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function capture(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createTask({ title: trimmed, goalId: captureGoalId, estimatedBlocks: estimate });
      setTitle('');
      // Burst pattern: Enter saves and stays.
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the task.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(task: Task) {
    if (window.confirm(`Delete "${task.title}"?`)) void deleteTask(task.id);
  }

  return (
    <div className="scroll" style={{ paddingBottom: 24 }}>
      <div className="enter" style={{ padding: '58px 20px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.4px' }}>
          Inbox · {inbox.length}
        </div>
      </div>

      {/* Quick capture */}
      <form className="enter-delay" onSubmit={capture} style={{ padding: '20px 16px 0' }}>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task"
          aria-label="New task title"
          style={{
            width: '100%',
            background: tokens.surface,
            border: `1.5px solid ${tokens.line}`,
            borderRadius: 12,
            padding: 16,
            color: tokens.t1,
            fontSize: 15,
            fontWeight: 500,
          }}
        />
        <div
          style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}
        >
          {goals.map((goal) => {
            const active = captureGoalId === goal.id;
            return (
              <Chip
                key={goal.id}
                label={goal.title}
                active={active}
                tint={goalColor(goal.id, colorMap)}
                onClick={() => setCaptureGoalId(active ? null : goal.id)}
              />
            );
          })}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: tokens.t4 }}>est</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEstimate(n)}
                className="tabular"
                aria-label={`Estimate ${n} block${n === 1 ? '' : 's'}`}
                aria-pressed={estimate === n}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  border: `1px solid ${estimate === n ? tokens.emberLine : tokens.line}`,
                  background: estimate === n ? tokens.surface3 : 'transparent',
                  color: estimate === n ? tokens.ember : tokens.t4,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <div style={{ fontSize: 13, fontWeight: 600, color: tokens.danger, marginTop: 8 }}>
            {error}
          </div>
        )}
      </form>

      {/* Grouped by goal */}
      <div className="enter-delay">
        {grouped.map(({ goalId, items }) => (
          <div key={goalId ?? 'unassigned'}>
            <SectionRow label={goalName(goalId, goals)} paddingHorizontal={16} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  goalColor={goalColor(task.goalId, colorMap)}
                  goalName={goalName(task.goalId, goals)}
                  showMeter={false}
                  footer={
                    <>
                      <GhostButton onClick={() => void updateTask(task.id, { status: 'planned' })}>
                        Commit to today
                      </GhostButton>
                      <GhostButton onClick={() => confirmDelete(task)} style={{ color: tokens.t4 }}>
                        Delete
                      </GhostButton>
                    </>
                  }
                />
              ))}
            </div>
          </div>
        ))}
        {inbox.length === 0 && (
          <p
            style={{
              padding: '32px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: tokens.t4,
              lineHeight: 1.5,
            }}
          >
            Inbox is empty.
          </p>
        )}
      </div>
    </div>
  );
}

function groupByGoal(tasks: Task[], goals: Goal[]): { goalId: string | null; items: Task[] }[] {
  const order: (string | null)[] = [...goals.map((g) => g.id), null];
  return order
    .map((goalId) => ({ goalId, items: tasks.filter((t) => t.goalId === goalId) }))
    .filter((group) => group.items.length > 0);
}
