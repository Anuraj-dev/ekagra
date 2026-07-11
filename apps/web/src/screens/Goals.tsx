import type { Goal } from '@ekagra/core';
import { type CSSProperties, useMemo, useRef, useState } from 'react';
import { useData } from '../data/DataProvider';
import { buildGoalColorMap, goalColor } from '../lib/goals';
import { color as tokens } from '../theme/tokens';

/** Goals — goal cards with role overline and weekly-rate meters (session-local data for now). */
export function Goals() {
  const { goals, tasks, earnedByTask, createGoal, updateGoal, deleteGoal } = useData();
  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const [editing, setEditing] = useState<Goal | null>(null);

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
        <GoalComposer onCreate={createGoal} />
        {goals.map((goal) => {
          const gColor = goalColor(goal.id, colorMap);
          const goalTasks = tasks.filter((t) => t.goalId === goal.id);
          const weeklyBlocks = goalTasks.reduce((sum, t) => sum + (earnedByTask[t.id] ?? 0), 0);
          return (
            <button
              type="button"
              key={goal.id}
              aria-label={`Edit goal ${goal.title}`}
              onClick={() => setEditing(goal)}
              style={{
                background: tokens.surface,
                border: `1px solid ${tokens.line}`,
                borderRadius: 16,
                padding: 18,
                textAlign: 'left',
                color: 'inherit',
                font: 'inherit',
                cursor: 'pointer',
                width: '100%',
                transition: 'background .15s var(--ease), border-color .15s var(--ease)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = tokens.surface3;
                e.currentTarget.style.borderColor = tokens.lineHi;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = tokens.surface;
                e.currentTarget.style.borderColor = tokens.line;
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
            </button>
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
            Click a goal to rename, re-role, or delete it. Rolling rates, not streaks.
          </p>
        )}
      </div>

      {editing && (
        <GoalSheet
          key={editing.id}
          goal={editing}
          onClose={() => setEditing(null)}
          onSave={updateGoal}
          onDelete={deleteGoal}
        />
      )}
    </div>
  );
}

/**
 * Inline create-goal flow: a "+ New goal" affordance that expands into a small
 * form (title + identity role), mirroring the quick-capture pattern on Tasks.
 */
function GoalComposer({
  onCreate,
}: {
  onCreate: (payload: { title: string; identityRole: string }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // React state updates are async — a synchronous lock is needed so
  // Enter + a fast button click can't double-submit before `busy` re-renders.
  const submitting = useRef(false);

  const canSave = title.trim().length > 0 && role.trim().length > 0 && !busy;

  async function save() {
    if (!canSave || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await onCreate({ title: title.trim(), identityRole: role.trim() });
      setTitle('');
      setRole('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the goal.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setTitle('');
          setRole('');
          setError(null);
          setOpen(true);
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: '8px 4px',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 700,
          color: tokens.ember,
        }}
      >
        + New goal
      </button>
    );
  }

  return (
    <div
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.line}`,
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Goal — what are you building?"
        // biome-ignore lint/a11y/noAutofocus: focus moves into the form the user just opened
        autoFocus
        style={inputStyle}
      />
      <input
        value={role}
        onChange={(e) => setRole(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void save();
        }}
        placeholder="Identity role — e.g. Engineer, Writer"
        style={inputStyle}
      />
      {error && <p style={{ fontSize: 13, fontWeight: 600, color: tokens.danger }}>{error}</p>}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void save()}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: canSave ? 'pointer' : 'default',
            fontSize: 13,
            fontWeight: 700,
            color: canSave ? tokens.ember : tokens.t4,
          }}
        >
          {busy ? 'Saving…' : 'Create goal'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
            fontSize: 13,
            fontWeight: 700,
            color: tokens.t4,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Goal detail / edit sheet — the management surface reached by clicking a goal card.
 * Renames, re-roles, edits the deadline, and deletes (behind a two-step confirm so
 * a destructive action is never a single click). Mirrors the mobile GoalSheet 1:1.
 */
function GoalSheet({
  goal,
  onClose,
  onSave,
  onDelete,
}: {
  goal: Goal;
  onClose: () => void;
  onSave: (
    id: string,
    payload: { title?: string; identityRole?: string; deadline?: string | null },
  ) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(goal.title);
  const [role, setRole] = useState(goal.identityRole);
  const [deadline, setDeadline] = useState(goal.deadline ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const trimmedDeadline = deadline.trim();
  const dirty =
    title.trim() !== goal.title ||
    role.trim() !== goal.identityRole ||
    trimmedDeadline !== (goal.deadline ?? '');
  const canSave = title.trim().length > 0 && role.trim().length > 0 && dirty && !busy;

  async function save() {
    if (!canSave || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await onSave(goal.id, {
        title: title.trim(),
        identityRole: role.trim(),
        deadline: trimmedDeadline.length > 0 ? trimmedDeadline : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the goal.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(goal.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the goal.');
      setBusy(false);
    }
  }

  const fieldLabel: CSSProperties = { fontSize: 10, color: tokens.t4 };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        zIndex: 40,
      }}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => !busy && onClose()}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(7,8,10,0.6)',
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <div
        role="dialog"
        aria-label="Edit goal"
        style={{
          position: 'relative',
          background: tokens.surface,
          borderTop: `1px solid ${tokens.line}`,
          borderRadius: '20px 20px 0 0',
          padding: '22px 20px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span className="overline" style={{ color: tokens.t3 }}>
          Edit goal
        </span>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="overline" style={fieldLabel}>
            Goal
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you building?"
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="overline" style={fieldLabel}>
            Identity role
          </span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Engineer, Writer"
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="overline" style={fieldLabel}>
            Deadline · optional
          </span>
          <input
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="e.g. 2026-09-01"
            style={inputStyle}
          />
        </label>
        {error && <p style={{ fontSize: 13, fontWeight: 600, color: tokens.danger }}>{error}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void save()}
            style={{
              flex: 1,
              borderRadius: 12,
              border: 'none',
              padding: '15px 0',
              fontSize: 15,
              fontWeight: 800,
              cursor: canSave ? 'pointer' : 'default',
              background: canSave ? tokens.ember : tokens.lineSoft,
              color: canSave ? tokens.bg : tokens.t4,
            }}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '0 8px',
              cursor: busy ? 'default' : 'pointer',
              fontSize: 14,
              fontWeight: 700,
              color: tokens.t3,
            }}
          >
            Cancel
          </button>
        </div>

        {/* Two-step delete: the first click arms, the second confirms. */}
        {confirmDelete ? (
          <div
            style={{
              borderRadius: 12,
              border: '1px solid rgba(228,121,107,0.4)',
              background: tokens.dangerDim,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: tokens.t2, lineHeight: 1.45 }}>
              Delete “{goal.title}”? Its tasks stay but lose this goal.
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: busy ? 'default' : 'pointer',
                  fontSize: 14,
                  fontWeight: 800,
                  color: tokens.danger,
                }}
              >
                {busy ? 'Deleting…' : 'Delete goal'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: busy ? 'default' : 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  color: tokens.t4,
                }}
              >
                Keep
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              padding: '6px 0',
              cursor: busy ? 'default' : 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: tokens.danger,
            }}
          >
            Delete goal
          </button>
        )}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  background: tokens.surface2,
  border: `1.5px solid ${tokens.line}`,
  borderRadius: 12,
  padding: 14,
  color: tokens.t1,
  fontSize: 15,
  fontWeight: 500,
  width: '100%',
  boxSizing: 'border-box',
};

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
