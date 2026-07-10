import type { DistractionTag, Session } from '@ekagra/core';
import { DISTRACTION_TAGS, remainingMs } from '@ekagra/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeftIcon, PauseIcon, ResumeGlyph } from '../components/icons';
import { TimerRing } from '../components/TimerRing';
import { useData } from '../data/DataProvider';
import { devicesApi } from '../lib/api';
import { blockLabel, formatClock } from '../lib/format';
import { buildGoalColorMap, goalColor, goalName } from '../lib/goals';
import { timerStateFromSession } from '../lib/timer';
import { useNav } from '../nav/navigation';
import { color as tokens } from '../theme/tokens';

type EndChoice = DistractionTag | 'done-early';

const TAG_COPY: Record<EndChoice, string> = {
  distraction: 'Distraction',
  interruption: 'Interruption',
  'done-early': 'Done early',
  energy: 'Low energy',
};

export function Focus() {
  const { close } = useNav();
  const {
    session: activeSession,
    goals,
    tasks,
    sessionAnchorMs,
    serverClockOffset,
    sessionCommand,
    reloadSession,
    earnedByTask,
  } = useData();

  const [nowMs, setNowMs] = useState(() => Date.now() + serverClockOffset);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [deskConnected, setDeskConnected] = useState(false);
  // Terminal session kept locally so the ended state renders immediately
  // (DataProvider clears the active session on terminal outcomes).
  const [endedSession, setEndedSession] = useState<Session | null>(null);
  // One shared guard for every terminal command (auto-complete AND manual end),
  // so they can't race each other at zero.
  const terminalRef = useRef(false);

  const colorMap = useMemo(() => buildGoalColorMap(goals), [goals]);
  const session = activeSession ?? endedSession;
  const terminal =
    session !== null && (session.status === 'completed' || session.status === 'abandoned');
  const task = session ? (tasks.find((t) => t.id === session.taskId) ?? null) : null;

  // Desk-light footer only renders when a paired device was recently seen.
  useEffect(() => {
    let active = true;
    devicesApi
      .list()
      .then((devices) => {
        if (!active) return;
        const connected = devices.some(
          (d) =>
            d.revoked_at === null &&
            d.last_seen_at !== null &&
            Date.now() - new Date(d.last_seen_at).getTime() < 120_000,
        );
        setDeskConnected(connected);
      })
      .catch(() => setDeskConnected(false));
    return () => {
      active = false;
    };
  }, []);

  // Local tick against the server-adjusted clock. Digits swap cleanly (no per-second animation).
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now() + serverClockOffset), 250);
    return () => window.clearInterval(id);
  }, [serverClockOffset]);

  const running = session?.status === 'running' && !terminal;
  const timerState = useMemo(
    () => (activeSession ? timerStateFromSession(activeSession, sessionAnchorMs) : null),
    [activeSession, sessionAnchorMs],
  );

  const remaining = useMemo(() => {
    if (!timerState) return 0;
    const adjustedNow = Math.max(nowMs, timerState.lastObservedAt ?? nowMs);
    return remainingMs(timerState, adjustedNow);
  }, [timerState, nowMs]);

  const totalMs = (session?.plannedMinutes ?? 25) * 60_000;
  const progress = terminal
    ? session?.status === 'completed'
      ? 1
      : totalMs > 0
        ? Math.min(1, (session.elapsedSeconds * 1000) / totalMs)
        : 0
    : totalMs > 0
      ? 1 - remaining / totalMs
      : 0;

  const complete = useCallback(async () => {
    if (terminalRef.current) return;
    terminalRef.current = true;
    try {
      const ended = await sessionCommand({ action: 'complete' });
      // Render the terminal state immediately; the timed close is cosmetic.
      setEndedSession(ended);
      setCelebrate(true);
      window.setTimeout(() => {
        close();
      }, 2600);
    } catch {
      // Server rejected (e.g. not yet zero, or already ended elsewhere):
      // release the guard and reconcile with the server's view.
      terminalRef.current = false;
      await reloadSession().catch(() => {});
    }
  }, [sessionCommand, close, reloadSession]);

  // Auto-complete when a running work block reaches zero.
  useEffect(() => {
    if (running && remaining <= 0 && !terminalRef.current && activeSession) {
      void complete();
    }
  }, [running, remaining, complete, activeSession]);

  if (!session) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: tokens.t3, fontWeight: 600 }}>No active session.</p>
        <button
          type="button"
          onClick={close}
          style={{ color: tokens.ember, marginTop: 12, fontWeight: 700 }}
        >
          Back to Today
        </button>
      </div>
    );
  }

  const gColor = task ? goalColor(task.goalId, colorMap) : tokens.goalTan;
  const earned = task ? (earnedByTask[task.id] ?? 0) : 0;
  const total = task?.estimatedBlocks ?? 1;

  async function togglePause() {
    // No pause/resume once a terminal command is in flight or the session ended.
    if (busy || terminal || terminalRef.current) return;
    // Resuming an expired block would be an invalid transition — complete instead.
    if (!running && remaining <= 0) {
      void complete();
      return;
    }
    setBusy(true);
    try {
      await sessionCommand({ action: running ? 'pause' : 'resume' });
    } catch {
      // Likely already ended (e.g. auto-complete won the race) — reconcile.
      await reloadSession().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function endSession(choice: EndChoice) {
    if (terminal || terminalRef.current) return;
    terminalRef.current = true;
    setBusy(true);
    try {
      const ended = await sessionCommand(
        choice === 'done-early'
          ? { action: 'completeEarly' }
          : { action: 'abandon', distractionTag: choice },
      );
      setEndedSession(ended);
      close();
    } catch {
      terminalRef.current = false;
      await reloadSession().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {running && (
        <div
          className="ring-vignette"
          style={{
            position: 'absolute',
            left: '50%',
            top: '38%',
            width: 600,
            height: 600,
            transform: 'translate(-50%,-50%)',
            background:
              'radial-gradient(circle at center, rgba(240,138,62,.08) 0%, rgba(240,138,62,0) 58%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 1,
          width: '100%',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            width: '100%',
            padding: '56px 20px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            aria-label="Close focus"
            onClick={close}
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: tokens.surface,
              border: `1px solid ${tokens.line}`,
              color: tokens.t2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeftIcon />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {terminal ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: tokens.green }} />
                <span className="overline" style={{ color: tokens.t2 }}>
                  {session.status === 'completed' ? 'Block earned' : 'Session ended'}
                </span>
              </div>
            ) : running ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: tokens.ember }} />
                <span className="overline" style={{ color: tokens.t2 }}>
                  Focus
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: tokens.surface,
                  border: `1px solid ${tokens.line}`,
                  borderRadius: 999,
                  padding: '6px 14px',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 2, background: tokens.ember }} />
                <span className="overline" style={{ color: tokens.ember }}>
                  Paused
                </span>
              </div>
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: tokens.t4,
              }}
            >
              {blockLabel(earned + 1, total)}
            </span>
          </div>
          <div style={{ width: 38 }} />
        </div>

        {/* Ring */}
        <div
          style={{
            position: 'relative',
            animation: celebrate ? 'ringFlash 500ms var(--ease)' : undefined,
          }}
        >
          <TimerRing
            progress={progress}
            status={running || terminal ? 'running' : 'paused'}
            phase={terminal && session.status === 'completed' ? 'break' : 'work'}
            timeLabel={terminal ? formatClock(0) : formatClock(Math.ceil(remaining / 1000))}
            subLabel={
              terminal
                ? session.status === 'completed'
                  ? 'Earned'
                  : 'Ended'
                : running
                  ? 'Remaining'
                  : 'Paused'
            }
          />
        </div>

        {/* Bound task */}
        {task && (
          <div style={{ marginTop: 38, width: '100%', padding: '0 40px', textAlign: 'center' }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: '-.2px',
                color: running ? tokens.t1 : tokens.t2,
              }}
            >
              {task.title}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <span style={{ width: 3, height: 13, borderRadius: 2, background: gColor }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: gColor }}>
                {goalName(task.goalId, goals)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 14 }}>
              {Array.from({ length: total }, (_, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative segments, index is the identity
                  key={`fseg-${total}-${i}`}
                  style={{
                    width: 26,
                    height: 6,
                    borderRadius: 3,
                    background:
                      i < earned ? (running ? gColor : 'rgba(196,143,191,.45)') : tokens.lineSoft,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls — removed entirely once the session is terminal. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          marginBottom: 46,
          zIndex: 1,
          visibility: terminal ? 'hidden' : 'visible',
        }}
      >
        <button
          type="button"
          aria-label={running ? 'Pause timer' : 'Resume timer'}
          onClick={togglePause}
          disabled={busy || terminal}
          style={
            running
              ? {
                  width: 76,
                  height: 76,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(14,15,18,.2)',
                  border: `1.5px solid ${tokens.line}`,
                }
              : {
                  width: 76,
                  height: 76,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tokens.ember,
                  border: '1px solid rgba(255,178,94,.34)',
                  boxShadow: '0 10px 30px rgba(240,138,62,.30)',
                }
          }
        >
          {running ? <PauseIcon /> : <ResumeGlyph />}
        </button>
        <button
          type="button"
          onClick={() => setEnding(true)}
          disabled={busy || terminal}
          style={{
            fontSize: running ? 13 : 14,
            fontWeight: 700,
            color: running ? tokens.t4 : tokens.t3,
          }}
        >
          End session — minutes are kept
        </button>
      </div>

      {deskConnected && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: tokens.t5,
            zIndex: 1,
          }}
        >
          {running ? 'Desk light mirrors this timer' : 'Paused · desk light dimmed'}
        </div>
      )}

      {celebrate && <EarnedToast />}
      {ending && (
        <EndSheet
          onCancel={() => setEnding(false)}
          onPick={(tag) => {
            setEnding(false);
            void endSession(tag);
          }}
        />
      )}
    </>
  );
}

function EarnedToast() {
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 140,
        background: 'rgba(91,191,138,.12)',
        border: '1px solid rgba(91,191,138,.40)',
        borderRadius: 999,
        padding: '12px 18px',
        textAlign: 'center',
        color: tokens.green,
        fontSize: 13,
        fontWeight: 700,
        zIndex: 3,
        animation: 'toastRise 400ms var(--ease) both',
      }}
    >
      Block earned. Banked.
    </div>
  );
}

function EndSheet({
  onCancel,
  onPick,
}: {
  onCancel: () => void;
  onPick: (choice: EndChoice) => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 4,
      }}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(7,8,10,.6)',
          cursor: 'default',
        }}
      />
      <div
        role="dialog"
        aria-label="End session"
        style={{
          position: 'relative',
          width: '100%',
          background: tokens.surface,
          borderTop: `1px solid ${tokens.line}`,
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,.55)',
          padding: '22px 20px 32px',
        }}
      >
        <div className="overline" style={{ color: tokens.t3 }}>
          What ended it?
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: tokens.t4, marginTop: 6 }}>
          Minutes are kept either way.
        </p>
        <button
          type="button"
          onClick={() => onPick('done-early')}
          style={{
            width: '100%',
            marginTop: 16,
            background: tokens.surface2,
            border: `1px solid ${tokens.lineSoft}`,
            borderRadius: 12,
            padding: '14px 16px',
            textAlign: 'left',
            fontSize: 15,
            fontWeight: 700,
            color: tokens.t2,
          }}
        >
          {TAG_COPY['done-early']}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {DISTRACTION_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onPick(tag)}
              style={{
                textAlign: 'left',
                background: tokens.surface2,
                border: `1px solid ${tokens.lineSoft}`,
                borderRadius: 12,
                padding: '14px 16px',
                fontSize: 15,
                fontWeight: 700,
                color: tokens.t2,
              }}
            >
              {TAG_COPY[tag]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
