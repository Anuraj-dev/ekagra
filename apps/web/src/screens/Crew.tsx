import type { Friend } from '@ekagra/core';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  ApiError,
  forgivenessApi,
  friendsApi,
  leaderboardApi,
  type WeeklyLeaderboardRow,
} from '../lib/api';
import { color as tokens } from '../theme/tokens';

export function Crew() {
  const { session } = useAuth();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([friendsApi.list(), leaderboardApi.weekly()])
      .then(([f, l]) => {
        if (active) {
          setFriends(f);
          setLeaderboard(l);
        }
      })
      .catch(
        (e) =>
          active && setError(e instanceof Error ? e.message : 'Crew could not load right now.'),
      );
    return () => {
      active = false;
    };
  }, []);

  async function run(action: () => Promise<unknown>, success?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await action();
      success?.();
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'That change could not be made. Check your Crew limit or the current invite.'
          : e instanceof Error
            ? e.message
            : 'Could not update your Crew.',
      );
    } finally {
      setBusy(false);
    }
  }
  function inviteFriend() {
    const email = invite.trim();
    if (!email) return;
    run(
      () => friendsApi.invite({ email }),
      () => {
        setInvite('');
        friendsApi
          .list()
          .then(setFriends)
          .catch(() => undefined);
      },
    );
  }
  const accepted = (friends ?? []).filter(
    (f) => f.status === 'accepted' || f.direction === 'friend',
  );

  return (
    <div className="scroll" style={{ paddingBottom: 32 }}>
      <ScreenHeader title="Crew" sub="Weekly earned blocks. Totals only — tasks stay private." />
      <div className="enter-delay">
        <Forgiveness
          applied={applied}
          busy={busy}
          onApply={() =>
            run(
              () => forgivenessApi.apply(),
              () => setApplied(true),
            )
          }
          error={error}
        />
        <Section title="Weekly Crew">
          {leaderboard === null ? (
            <Muted>Loading the leaderboard…</Muted>
          ) : leaderboard.length === 0 ? (
            <Muted>Complete a block to start this week’s board.</Muted>
          ) : (
            <div>
              {leaderboard.map((row, index) => {
                const isYou = row.userId === session?.user.id;
                const name = isYou ? 'You' : row.displayName || 'Crew member';
                const top = Math.max(1, ...leaderboard.map((r) => r.earnedBlocks));
                return (
                  <div
                    key={row.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: isYou ? '13px 10px' : '13px 0',
                      margin: isYou ? '0 -10px' : 0,
                      borderBottom: `1px solid ${isYou ? tokens.emberLine : tokens.lineSoft}`,
                      border: isYou ? `1px solid ${tokens.emberLine}` : undefined,
                      borderRadius: isYou ? 12 : 0,
                      background: isYou ? tokens.emberWash : undefined,
                      color: isYou ? tokens.t1 : tokens.t2,
                    }}
                  >
                    <span
                      className="tabular"
                      style={{
                        width: 22,
                        color: isYou ? tokens.ember : tokens.t4,
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </span>
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: tokens.surface3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        color: tokens.t2,
                        flexShrink: 0,
                      }}
                    >
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          marginTop: 5,
                          height: 3,
                          borderRadius: 2,
                          background: tokens.surface3,
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            width: `${Math.round((row.earnedBlocks / top) * 100)}%`,
                            height: 3,
                            borderRadius: 2,
                            background: isYou ? tokens.ember : tokens.t4,
                          }}
                        />
                      </span>
                    </span>
                    <span className="tabular" style={{ fontSize: 20, fontWeight: 800 }}>
                      {row.earnedBlocks}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
        <Section title={`Friends · ${accepted.length}/12`}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="Invite by email"
              aria-label="Friend email"
              style={inputStyle}
            />
            <button
              type="button"
              disabled={busy || !invite.trim()}
              onClick={inviteFriend}
              style={buttonStyle}
            >
              Invite
            </button>
          </div>
          {friends === null ? (
            <Muted>Loading friends…</Muted>
          ) : friends.length === 0 ? (
            <Muted>Your Crew is empty. Invite someone by email.</Muted>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 0',
                  borderBottom: `1px solid ${tokens.lineSoft}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{friend.displayName}</div>
                  <div style={{ fontSize: 11, color: tokens.t4, marginTop: 3 }}>
                    {friend.direction === 'incoming' ? 'Wants to join' : friend.status}
                  </div>
                </div>
                {friend.direction === 'incoming' && friend.status === 'pending' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => friendsApi.accept(friend.id),
                        () =>
                          setFriends(
                            (old) =>
                              old?.map((f) =>
                                f.id === friend.id
                                  ? { ...f, status: 'accepted', direction: 'friend' }
                                  : f,
                              ) ?? null,
                          ),
                      )
                    }
                    style={buttonStyle}
                  >
                    Accept
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => friendsApi.remove(friend.id),
                      () => setFriends((old) => old?.filter((f) => f.id !== friend.id) ?? null),
                    )
                  }
                  style={{ ...buttonStyle, color: tokens.t4, background: 'transparent' }}
                >
                  Remove
                </button>
              </div>
            ))
          )}
          {error && (
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: tokens.danger }}>
              {error}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ margin: '24px 16px 0' }}>
      <div className="overline" style={{ color: tokens.t3, marginBottom: 10 }}>
        {title}
      </div>
      <div
        style={{
          padding: '5px 16px 8px',
          background: tokens.surface2,
          border: `1px solid ${tokens.lineSoft}`,
          borderRadius: 16,
        }}
      >
        {children}
      </div>
    </div>
  );
}
function Muted({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '12px 0',
        fontSize: 13,
        lineHeight: 1.5,
        fontWeight: 600,
        color: tokens.t4,
      }}
    >
      {children}
    </div>
  );
}
function Forgiveness({
  applied,
  busy,
  onApply,
  error,
}: {
  applied: boolean;
  busy: boolean;
  onApply: () => void;
  error: string | null;
}) {
  return (
    <div
      style={{
        margin: '16px 16px 0',
        padding: '15px 18px',
        background: tokens.surface2,
        border: `1px solid ${tokens.lineSoft}`,
        borderRadius: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: tokens.green }} />
        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: tokens.t2 }}>
          {applied
            ? 'Forgiveness token · used this week.'
            : 'Forgiveness token · one per week, protects one missed day.'}
        </div>
        {!applied && (
          <button
            type="button"
            disabled={busy}
            onClick={onApply}
            style={{ ...buttonStyle, color: tokens.green, background: 'transparent' }}
          >
            Use
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 12, color: tokens.danger, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
const inputStyle = {
  flex: 1,
  minWidth: 0,
  background: tokens.bg,
  border: `1px solid ${tokens.line}`,
  borderRadius: 10,
  padding: '10px 12px',
  color: tokens.t1,
  font: '600 13px Manrope, sans-serif',
};
const buttonStyle = {
  border: 0,
  borderRadius: 10,
  padding: '9px 12px',
  background: tokens.emberWash,
  color: tokens.ember,
  font: '800 12px Manrope, sans-serif',
  whiteSpace: 'nowrap' as const,
};
