import { color, space } from '@ekagra/tokens';
import { View } from 'react-native';

/**
 * Segmented ledger bar (DESIGN-SPEC §6). Each segment is one estimated block;
 * earned segments fill with the goal color, remaining stay --line-soft.
 */
export function BlockMeter({
  total,
  earned,
  color: tint,
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
    <View
      accessible
      accessibilityLabel={`${filled} of ${segments} blocks`}
      accessibilityRole="progressbar"
      style={{
        flexDirection: 'row',
        gap: 4,
        marginTop: space[3],
        justifyContent: centered ? 'center' : 'flex-start',
      }}
    >
      {Array.from({ length: segments }, (_, i) => {
        const done = i < filled;
        return (
          <View
            aria-hidden
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count homogeneous segments, never reordered
            key={`seg-${segments}-${i}`}
            style={{
              height: 6,
              borderRadius: 3,
              flexGrow: 0,
              flexShrink: 0,
              width: fixedSegmentWidth ?? 32,
              backgroundColor: done ? tint : color.lineSoft,
            }}
          />
        );
      })}
    </View>
  );
}
