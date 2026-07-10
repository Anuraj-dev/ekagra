import { View } from 'react-native';
import { color } from '../theme/tokens';

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
  const segments = Math.max(1, total);
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        marginTop: 12,
        justifyContent: centered ? 'center' : 'flex-start',
      }}
    >
      {Array.from({ length: segments }, (_, i) => {
        const done = i < earned;
        return (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count homogeneous segments, never reordered
            key={`seg-${segments}-${i}`}
            style={{
              height: 6,
              borderRadius: 3,
              flexGrow: fixedSegmentWidth ? 0 : 1,
              flexBasis: fixedSegmentWidth ?? 0,
              width: fixedSegmentWidth,
              maxWidth: fixedSegmentWidth ?? 32,
              backgroundColor: done ? tint : color.lineSoft,
            }}
          />
        );
      })}
    </View>
  );
}
