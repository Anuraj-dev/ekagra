import type { Task } from '@ekagra/core';
import { Pressable, Text, View } from 'react-native';
import { color } from '../theme/tokens';
import { tabular, text } from '../theme/typography';
import { BlockMeter } from './BlockMeter';

/**
 * Committed task card (DESIGN-SPEC §6/§9-Today): goal mark row, title, block meter.
 * Selected → ember-line border + surface-3. Omit the meter for inbox candidates.
 * `selectable` renders a radio-style indicator so tap-to-select reads as an
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
  onPress,
}: {
  task: Task;
  goalColor: string;
  goalName: string;
  earnedBlocks?: number;
  selected?: boolean;
  selectable?: boolean;
  showMeter?: boolean;
  onPress?: () => void;
}) {
  const total = task.estimatedBlocks ?? 1;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selectable ? { selected } : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? color.surface3 : pressed ? color.surface3 : color.surface,
        borderWidth: 1,
        borderColor: selected ? 'rgba(240,138,62,0.45)' : pressed ? color.lineHi : color.line,
        borderRadius: 16,
        padding: 16,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: goalColor }} />
        <Text style={text(700, { fontSize: 12, color: goalColor })}>{goalName}</Text>
        <Text style={[tabular, text(600, { fontSize: 12, color: color.t4, marginLeft: 'auto' })]}>
          {showMeter
            ? `${earnedBlocks} / ${total} block${total === 1 ? '' : 's'}`
            : `est ${total} block${total === 1 ? '' : 's'}`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 9 }}>
        {selectable && (
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: selected ? color.ember : color.lineHi,
              backgroundColor: selected ? color.ember : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected && (
              <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: color.bg }} />
            )}
          </View>
        )}
        <Text
          style={text(700, { fontSize: 16, letterSpacing: -0.1, color: color.t1, flexShrink: 1 })}
        >
          {task.title}
        </Text>
      </View>
      {showMeter && <BlockMeter total={total} earned={earnedBlocks} color={goalColor} />}
    </Pressable>
  );
}
