import { space, color as tokens } from '../theme/tokens';

/**
 * Segmented ledger bar (DESIGN-SPEC §6). Each segment is one estimated block;
 * earned segments fill with the goal color, remaining stay --line-soft.
 */
export function BlockMeter({
  total,
  earned,
  color,
  centered = false,
  fixedSegmentWidth,
}: {
  total: number;
  earned: number;
  color: string;
  centered?: boolean;
  fixedSegmentWidth?: number;
}) {
  if (total <= 0) return null;
  const segments = total;
  const filled = Math.max(0, Math.min(earned, segments));
  return (
    <div
      role="progressbar"
      aria-label={`${filled} of ${segments} blocks`}
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={segments}
      style={{
        display: 'flex',
        gap: 4,
        marginTop: space[3],
        justifyContent: centered ? 'center' : 'flex-start',
      }}
    >
      {Array.from({ length: segments }, (_, i) => {
        const done = i < filled;
        return (
          <span
            aria-hidden="true"
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative segments, index is the identity
            key={`seg-${segments}-${i}`}
            style={{
              height: 6,
              borderRadius: 3,
              flexGrow: 0,
              flexShrink: 0,
              width: fixedSegmentWidth ?? 32,
              background: done ? color : tokens.lineSoft,
            }}
          />
        );
      })}
    </div>
  );
}
