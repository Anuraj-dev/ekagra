import { color as tokens } from '../theme/tokens';

/**
 * Today header ledger (DESIGN-SPEC §6): one slim vertical tick per planned block
 * across all committed tasks. Earned = ember (with faint halo), planned = --line-soft.
 */
export function DayLedger({ planned, earned }: { planned: number; earned: number }) {
  const total = Math.max(1, planned);
  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '20px 28px 4px',
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const on = i < earned;
          return (
            <span
              key={`tick-${total}-${i}`}
              style={{
                width: 8,
                height: 24,
                borderRadius: 999,
                background: on ? tokens.ember : tokens.lineSoft,
                boxShadow: on ? '0 0 10px rgba(240,138,62,.16)' : undefined,
              }}
            />
          );
        })}
      </div>
      <div style={{ padding: '0 20px', fontSize: 11, fontWeight: 600, color: tokens.t5 }}>
        Each mark is one planned block. Filled = earned.
      </div>
    </div>
  );
}
