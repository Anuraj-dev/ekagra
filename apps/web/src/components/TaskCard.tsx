import type { Task } from '@ekagra/core';
import { color as tokens } from '../theme/tokens';
import { BlockMeter } from './BlockMeter';

/**
 * Committed task card (DESIGN-SPEC §6/§9-Today): goal mark row, title, block meter.
 * Selected → ember-line border + surface-3. Omit the meter for inbox candidates.
 * `selectable` renders a radio-style indicator so click-to-select reads as an
 * affordance instead of a hidden behavior.
 */
export function TaskCard({
  task,
  goalColor,
  goalName,
  earnedBlocks = 0,
  selected = false,
  selectable = false,
  showMeter = true,
  onClick,
}: {
  task: Task;
  goalColor: string;
  goalName: string;
  earnedBlocks?: number;
  selected?: boolean;
  selectable?: boolean;
  showMeter?: boolean;
  onClick?: () => void;
}) {
  const total = task.estimatedBlocks ?? 1;
  return (
    <button
      type="button"
      aria-pressed={selectable ? selected : undefined}
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: selected ? tokens.surface3 : tokens.surface,
        border: `1px solid ${selected ? 'rgba(240,138,62,.45)' : tokens.line}`,
        borderRadius: 16,
        padding: 16,
        transition: 'border-color .18s var(--ease), background .18s var(--ease)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 13, borderRadius: 2, background: goalColor }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: goalColor }}>{goalName}</span>
        <span
          className="tabular"
          style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: tokens.t4 }}
        >
          {showMeter
            ? `${earnedBlocks} / ${total} block${total === 1 ? '' : 's'}`
            : `est ${total} block${total === 1 ? '' : 's'}`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 9 }}>
        {selectable && (
          <span
            aria-hidden
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              flexShrink: 0,
              border: `1.5px solid ${selected ? tokens.ember : tokens.lineHi}`,
              background: selected ? tokens.ember : 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background .18s var(--ease), border-color .18s var(--ease)',
            }}
          >
            {selected && (
              <span style={{ width: 6, height: 6, borderRadius: 999, background: tokens.bg }} />
            )}
          </span>
        )}
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.1px' }}>{task.title}</span>
      </div>
      {showMeter && <BlockMeter total={total} earned={earnedBlocks} color={goalColor} />}
    </button>
  );
}
