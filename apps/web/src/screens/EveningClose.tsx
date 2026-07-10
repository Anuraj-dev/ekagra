import { useMemo, useState } from 'react';
import { CheckIcon } from '../components/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { useData } from '../data/DataProvider';
import { useNav } from '../nav/navigation';
import { color as tokens } from '../theme/tokens';

const WENT_WRONG_TAGS = ['on-plan', 'scope-creep', 'interruptions', 'low-energy', 'other'] as const;
const TAG_LABEL: Record<(typeof WENT_WRONG_TAGS)[number], string> = {
  'on-plan': 'Stayed on plan',
  'scope-creep': 'Scope grew',
  interruptions: 'Interruptions',
  'low-energy': 'Low energy',
  other: 'Something else',
};

export function EveningClose() {
  const { close } = useNav();
  const { tasks, todayEarnedBlocks, todayHonestMinutes, closeEvening } = useData();

  const plannedBlocks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'planned')
        .reduce((sum, t) => sum + (t.estimatedBlocks ?? 1), 0),
    [tasks],
  );

  const [planMatch, setPlanMatch] = useState(true);
  const [tag, setTag] = useState<(typeof WENT_WRONG_TAGS)[number]>('on-plan');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await closeEvening({ planMatch, wentWrongTag: tag, note: note.trim() || null });
      setClosed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close the day.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-frame">
      <div className="scroll" style={{ paddingBottom: 32 }}>
        <ScreenHeader title="Evening Close" sub="Close the day." onBack={close} />

        {closed ? (
          <div className="enter-delay" style={{ margin: '32px 16px 0' }}>
            <div
              style={{
                background: tokens.surface,
                border: '1px solid rgba(91,191,138,.35)',
                borderRadius: 18,
                padding: '26px 22px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  background: 'rgba(91,191,138,.14)',
                  border: '1px solid rgba(91,191,138,.18)',
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckIcon />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 16 }}>Day closed.</div>
              {note.trim() && (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: tokens.t2,
                    marginTop: 8,
                    lineHeight: 1.55,
                  }}
                >
                  “{note.trim()}”
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 600, color: tokens.t4, marginTop: 14 }}>
                {todayEarnedBlocks} blocks banked · {todayHonestMinutes} honest minutes
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              style={{
                marginTop: 20,
                width: '100%',
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: tokens.t3,
              }}
            >
              Back to Today
            </button>
          </div>
        ) : (
          <div className="enter-delay">
            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 10, padding: '24px 16px 0' }}>
              <Stat
                value={`${todayEarnedBlocks}`}
                suffix={` / ${plannedBlocks}`}
                label="Blocks earned"
                color={tokens.ember}
              />
              <Stat value={`${todayHonestMinutes}`} label="Honest minutes" color={tokens.green} />
            </div>

            {/* Plan match */}
            <div style={{ padding: '24px 16px 0' }}>
              <div className="overline" style={{ color: tokens.t3, marginBottom: 10 }}>
                Did the day match the plan?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: true, label: 'Yes' },
                  { key: false, label: 'No' },
                ].map(({ key, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPlanMatch(key)}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      padding: '12px',
                      fontSize: 14,
                      fontWeight: 700,
                      background: planMatch === key ? tokens.surface3 : tokens.surface,
                      border: `1px solid ${planMatch === key ? 'rgba(240,138,62,.45)' : tokens.line}`,
                      color: planMatch === key ? tokens.t1 : tokens.t3,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* What got in the way */}
            <div style={{ padding: '20px 16px 0' }}>
              <div className="overline" style={{ color: tokens.t3, marginBottom: 10 }}>
                What shaped the day
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {WENT_WRONG_TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    style={{
                      borderRadius: 999,
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: tag === t ? 'rgba(240,138,62,.10)' : tokens.surface,
                      border: `1px solid ${tag === t ? 'rgba(240,138,62,.45)' : tokens.line}`,
                      color: tag === t ? tokens.ember : tokens.t3,
                    }}
                  >
                    {TAG_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* One line */}
            <div style={{ padding: '24px 16px 0' }}>
              <div className="overline" style={{ color: tokens.t3, marginBottom: 10 }}>
                One line
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                placeholder="What did today teach you?"
                style={{
                  width: '100%',
                  height: 104,
                  background: tokens.surface,
                  border: `1.5px solid ${tokens.line}`,
                  borderRadius: 12,
                  padding: 16,
                  color: tokens.t1,
                  fontSize: 15,
                  fontWeight: 500,
                  resize: 'none',
                  lineHeight: 1.5,
                }}
              />
              {error && (
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E4796B', marginTop: 10 }}>
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                style={{
                  marginTop: 14,
                  width: '100%',
                  borderRadius: 999,
                  padding: 17,
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  background: tokens.ember,
                  color: '#0E0F12',
                }}
              >
                {busy ? 'Closing…' : 'Close the day'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  value,
  suffix,
  label,
  color,
}: {
  value: string;
  suffix?: string;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: tokens.surface,
        border: `1px solid ${tokens.line}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        className="tabular"
        style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.5px', lineHeight: 1, color }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: 17, color: tokens.t4, fontWeight: 700 }}>{suffix}</span>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: tokens.t3, marginTop: 8 }}>{label}</div>
    </div>
  );
}
