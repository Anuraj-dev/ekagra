import { color as tokens } from '../theme/tokens';

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
  const segments = Math.max(1, total);
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        marginTop: 12,
        justifyContent: centered ? 'center' : 'flex-start',
      }}
    >
      {Array.from({ length: segments }, (_, i) => {
        const done = i < earned;
        return (
          <span
            key={`seg-${segments}-${i}`}
            style={{
              height: 6,
              borderRadius: 3,
              flex: fixedSegmentWidth ? undefined : 1,
              width: fixedSegmentWidth,
              maxWidth: fixedSegmentWidth ? undefined : 32,
              background: done ? color : tokens.lineSoft,
            }}
          />
        );
      })}
    </div>
  );
}
