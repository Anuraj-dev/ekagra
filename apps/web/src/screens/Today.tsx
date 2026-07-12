import type { MotivationStatus } from '@ekagra/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { DayLedger } from '../components/DayLedger';
import { PlayIcon, SettingsIcon } from '../components/icons';
import { MotivationPanel, RateRings } from '../components/Motivation';
import { TaskCard } from '../components/TaskCard';
import { CircleButton, GhostButton, SectionRow } from '../components/ui';
import { useData } from '../data/DataProvider';
import { motivationApi } from '../lib/api';
import { formatClock, formatLongDate, greeting } from '../lib/format';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { isDayClosedToday, loadCuePrefs, type RitualCue, ritualCueState } from '../lib/rituals';
import { useNav } from '../nav/navigation';
import { color as tokens } from '../theme/tokens';

// Last-known motivation snapshot survives tab-switch remounts so the rhythm
// rings show the previous value while a refresh is in flight instead of
// flickering through an empty/zero state.
const motivationCache = new Map<string, MotivationStatus>();

export function Today() {
  const { open } = useNav();
  const { session } = useAuth();
  const {
    goals,
    tasks,
    todayEarnedBlocks,
    todayHonestMinutes,
    earnedByTask,
    startSession,
    session: activeSession,
    sessionEndVersion,
  } = useData();
  const userId = session?.user.id;

  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const committed = useMemo(() => tasks.filter((t) => t.status === 'planned'), [tasks]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedCue, setDismissedCue] = useState<RitualCue>(null);
  const [motivation, setMotivation] = useState<{ userId: string; value: MotivationStatus } | null>(
    () => {
      const value = userId ? motivationCache.get(userId) : null;
      return userId && value ? { userId, value } : null;
    },
  );
  const ticket = useRef(0);

  const plannedBlocks = committed.reduce((sum, t) => sum + (t.estimatedBlocks ?? 1), 0);
  const selected = committed.find((t) => t.id === selectedId) ?? null;
  const name = (session?.user.user_metadata?.name as string | undefined) ?? '';
  const visibleMotivation = motivation && motivation.userId === userId ? motivation.value : null;

  // Cue state re-evaluates over time: a Today screen left open across a cue
  // time must still surface the banner, so tick every 30s and on refocus.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, 30_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const cuePrefs = useMemo(() => loadCuePrefs(), []);
  const cue = ritualCueState({
    nowMinutes: now.getHours() * 60 + now.getMinutes(),
    prefs: cuePrefs,
    hasMorningPlan: committed.length > 0,
    dayClosed: isDayClosedToday(now),
  });
  const showCue = cue !== null && cue !== dismissedCue;

  // Refresh the rhythm/motivation stats on mount and whenever a session ends;
  // failures keep the last-known value on screen.
  useEffect(() => {
    const current = ++ticket.current;
    void sessionEndVersion;
    if (!userId) {
      setMotivation(null);
      return;
    }
    motivationApi
      .status()
      .then((value) => {
        if (current !== ticket.current) return;
        motivationCache.set(userId, value);
        setMotivation({ userId, value });
      })
      .catch(() => undefined);
    return () => {
      ++ticket.current;
    };
  }, [sessionEndVersion, userId]);

  async function start() {
    // Client-side hard-block: no owned planned task selected → cannot start.
    if (!selected || activeSession) return;
    setBusy(true);
    setError(null);
    try {
      await startSession(selected.id);
      open('focus');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the session.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scroll" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div
        className="enter"
        style={{ position: 'relative', padding: '58px 20px 0', overflow: 'hidden' }}
      >
        <div
          style={{
            position: 'absolute',
            right: -60,
            top: -40,
            width: 220,
            height: 180,
            background:
              'radial-gradient(circle at center, rgba(240,138,62,.10) 0%, rgba(240,138,62,0) 66%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'absolute', right: 20, top: 56 }}>
          <CircleButton aria-label="Settings" onClick={() => open('settings')}>
            <SettingsIcon />
          </CircleButton>
        </div>
        <div className="overline" style={{ color: tokens.t4 }}>
          {formatLongDate(now)}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.4px', marginTop: 8 }}>
          {greeting(now)}
          {name ? `, ${name}` : ''}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: tokens.t3,
            marginTop: 6,
            lineHeight: 1.45,
          }}
        >
          <b style={{ color: tokens.ember, fontWeight: 800 }}>{todayEarnedBlocks}</b> of{' '}
          {plannedBlocks} block{plannedBlocks === 1 ? '' : 's'} earned · {todayHonestMinutes} honest
          minute{todayHonestMinutes === 1 ? '' : 's'}
        </div>
      </div>

      <div className="enter-delay">
        {showCue && cue && (
          <CueBanner
            cue={cue}
            onAct={() => open(cue === 'morning' ? 'morning-commit' : 'evening-close')}
            onDismiss={() => setDismissedCue(cue)}
          />
        )}
        {visibleMotivation && (
          <MotivationPanel status={visibleMotivation} onPlan={() => open('morning-commit')} />
        )}
        {visibleMotivation && (
          <div
            style={{
              margin: '18px 16px 0',
              padding: '14px 16px',
              borderRadius: 16,
              background: tokens.surface2,
              border: `1px solid ${tokens.lineSoft}`,
            }}
          >
            <div className="overline" style={{ color: tokens.t3, marginBottom: 10 }}>
              Your rhythm
            </div>
            <RateRings rates={visibleMotivation.rates} />
          </div>
        )}
        <DayLedger planned={plannedBlocks} earned={todayEarnedBlocks} />

        {committed.length === 0 ? (
          <EmptyCommit onCommit={() => open('morning-commit')} />
        ) : (
          <>
            <SectionRow
              label={`Committed · ${committed.length} task${committed.length === 1 ? '' : 's'}`}
              action={<GhostButton onClick={() => open('morning-commit')}>Edit</GhostButton>}
              paddingHorizontal={16}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
              {committed.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  goalColor={goalColor(task.goalId, colorMap)}
                  goalName={goalName(task.goalId, goals)}
                  earnedBlocks={earnedByTask[task.id] ?? 0}
                  selected={task.id === selectedId}
                  selectable
                  onClick={() => setSelectedId((current) => (current === task.id ? null : task.id))}
                />
              ))}
            </div>

            {/* Start focus bar — disabled well (hard-block visible) until a task is picked. */}
            <div style={{ padding: '20px 16px 0' }}>
              <StartBar
                selectedTitle={selected?.title ?? null}
                disabled={!selected || busy || Boolean(activeSession)}
                onStart={start}
              />
              {error && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: tokens.danger,
                    marginTop: 8,
                    padding: '0 4px',
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            {/* Close the day entry — recessed. */}
            <button
              type="button"
              onClick={() => open('evening-close')}
              style={{
                display: 'flex',
                width: 'calc(100% - 32px)',
                margin: '12px 16px 0',
                background: tokens.surface2,
                border: `1px solid ${tokens.lineSoft}`,
                borderRadius: 16,
                padding: '15px 18px',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: tokens.t2 }}>
                  Close the day
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: tokens.t4,
                    marginTop: 2,
                  }}
                >
                  {todayHonestMinutes} honest minute{todayHonestMinutes === 1 ? '' : 's'} so far
                </span>
              </span>
              <span style={{ color: tokens.t4, fontSize: 18 }}>›</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StartBar({
  selectedTitle,
  disabled,
  onStart,
}: {
  selectedTitle: string | null;
  disabled: boolean;
  onStart: () => void;
}) {
  if (!selectedTitle) {
    return (
      <div
        style={{
          borderRadius: 16,
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: tokens.surface2,
          border: `1px solid ${tokens.lineSoft}`,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            flex: 'none',
            background: tokens.surface3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PlayIcon fill={tokens.t4} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: tokens.t3 }}>
            Select a task above to start
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: tokens.t4, marginTop: 2 }}>
            Click a committed task — a focus block always belongs to one
          </div>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      style={{
        width: '100%',
        borderRadius: 16,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
        background: tokens.emberWash,
        border: `1px solid ${tokens.emberLine}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          flex: 'none',
          background: tokens.ember,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PlayIcon />
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 800, letterSpacing: '-.1px' }}>
          Start focus
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: tokens.t3,
            marginTop: 2,
          }}
        >
          {selectedTitle}
        </span>
      </span>
      <span
        className="tabular"
        style={{
          marginLeft: 'auto',
          fontSize: 20,
          fontWeight: 800,
          color: tokens.ember,
          letterSpacing: '-.5px',
        }}
      >
        {formatClock(25 * 60)}
      </span>
    </button>
  );
}

/** Dismissible in-app ritual cue shown on Today when a cue time has passed. */
function CueBanner({
  cue,
  onAct,
  onDismiss,
}: {
  cue: 'morning' | 'evening';
  onAct: () => void;
  onDismiss: () => void;
}) {
  const title = cue === 'morning' ? 'Morning commit?' : 'Close your day?';
  const body =
    cue === 'morning'
      ? 'Pick 1–3 tasks to commit to today.'
      : 'Log how the day went and bank your blocks.';
  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div
        style={{
          background: tokens.emberWash,
          border: `1px solid ${tokens.emberLine}`,
          borderRadius: 16,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={onAct}
          style={{ flex: 1, textAlign: 'left', background: 'none' }}
        >
          <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: tokens.t1 }}>
            {title}
          </span>
          <span
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: tokens.t3,
              marginTop: 2,
            }}
          >
            {body}
          </span>
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{ flex: 'none', fontSize: 18, fontWeight: 700, color: tokens.t4, padding: 4 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function EmptyCommit({ onCommit }: { onCommit: () => void }) {
  return (
    <div style={{ padding: '32px 20px' }}>
      <SectionRow label="No plan yet" />
      <div style={{ padding: '0 16px' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: tokens.t3, lineHeight: 1.5 }}>
          Commit 1–3 tasks to start the day. You can't start a focus block without a plan.
        </p>
        <button
          type="button"
          onClick={onCommit}
          style={{
            marginTop: 16,
            borderRadius: 999,
            padding: 15,
            width: '100%',
            fontSize: 15,
            fontWeight: 800,
            background: tokens.ember,
            color: '#0E0F12',
          }}
        >
          Morning Commit
        </button>
      </div>
    </div>
  );
}
