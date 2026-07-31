import { color } from '@ekagra/tokens';
import { Text, View } from 'react-native';
import { text } from '../theme/typography';

/**
 * Today header ledger (DESIGN-SPEC §6): one slim vertical tick per planned block
 * across all committed tasks. Earned = ember (with faint halo), planned = --line-soft.
 */
export function DayLedger({ planned, earned }: { planned: number; earned: number }) {
  const total = Math.max(1, planned);
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingHorizontal: 28,
          paddingTop: 20,
          paddingBottom: 4,
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const on = i < earned;
          return (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count day ledger ticks, never reordered
              key={`tick-${total}-${i}`}
              style={{
                flex: 1,
                maxWidth: 8,
                height: 24,
                borderRadius: 999,
                backgroundColor: on ? color.ember : color.lineSoft,
                // Faint ember halo on earned ticks (elevation approximates the web glow).
                shadowColor: color.ember,
                shadowOpacity: on ? 0.5 : 0,
                shadowRadius: on ? 6 : 0,
                shadowOffset: { width: 0, height: 0 },
                elevation: on ? 3 : 0,
              }}
            />
          );
        })}
      </View>
      <Text style={[text(600, { fontSize: 11, color: color.t5 }), { paddingHorizontal: 20 }]}>
        Each mark is one planned block. Filled = earned.
      </Text>
    </View>
  );
}
