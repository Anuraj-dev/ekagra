import { useState } from 'react';
import { useData } from '../data/DataProvider';
import { forgivenessApi } from '../lib/api';
import { color as tokens } from '../theme/tokens';

/**
 * Crew — weekly earned blocks, totals only. Phase 2 exposes no friends-leaderboard
 * endpoint to the web client, so this shows your own weekly totals and the
 * forgiveness token; the ranked list lands with the leaderboard endpoint.
 */
export function Crew() {
  const { todayEarnedBlocks, todayHonestMinutes } = useData();
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function applyForgiveness() {
    setBusy(true);
    setError(null);
    try {
      const res = await forgivenessApi.apply();
      setApplied(res.usedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the token.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scroll" style={{ paddingBottom: 24 }}>
      <div className="enter" style={{ padding: '58px 20px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.4px' }}>Crew</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: tokens.t3, marginTop: 6 }}>
          Weekly earned blocks. Totals only — tasks stay private.
        </div>
      </div>

      <div className="enter-delay">
        {/* Forgiveness token — plain recessed row */}
        <div
          style={{
            margin: '24px 16px 0',
            background: tokens.surface2,
            border: `1px solid ${tokens.lineSoft}`,
            borderRadius: 16,
            padding: '15px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 3,
                background: tokens.green,
                flex: 'none',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: tokens.t2 }}>
                Forgiveness token
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: tokens.t4, marginTop: 2 }}>
                {applied ? 'Used this week.' : 'One per week. Wipes one missed day from the rate.'}
              </div>
            </div>
            {!applied && (
              <button
                type="button"
                onClick={applyForgiveness}
                disabled={busy}
                style={{ fontSize: 13, fontWeight: 700, color: tokens.green }}
              >
                Use
              </button>
            )}
          </div>
          {error && (
            <div style={{ fontSize: 12, fontWeight: 600, color: '#E4796B', marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>

        {/* You row — the only highlighted row */}
        <div
          style={{
            margin: '12px 16px 0',
            background: 'rgba(240,138,62,.10)',
            border: '1px solid rgba(240,138,62,.45)',
            borderRadius: 16,
            padding: '15px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: tokens.surface3,
              color: tokens.ember,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 800,
              flex: 'none',
            }}
          >
            You
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>This session</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: tokens.t3, marginTop: 2 }}>
              {todayHonestMinutes} honest minutes
            </div>
          </div>
          <span className="tabular" style={{ fontSize: 20, fontWeight: 800, color: tokens.ember }}>
            {todayEarnedBlocks}
          </span>
        </div>

        <p
          style={{
            padding: '20px 20px 0',
            fontSize: 12,
            fontWeight: 600,
            color: tokens.t5,
            lineHeight: 1.5,
          }}
        >
          The ranked Crew list lands with the leaderboard endpoint. Aggregates only — task titles
          and reflections are never shared.
        </p>
      </div>
    </div>
  );
}
