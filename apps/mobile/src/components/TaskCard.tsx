import type { Task } from '@ekagra/core';
import { Pressable, Text, View } from 'react-native';
import { color } from '../theme/tokens';
import { tabular, text } from '../theme/typography';
import { BlockMeter } from './BlockMeter';

/**
 * Committed task card (DESIGN-SPEC §6/§9-Today): goal mark row, title, block meter.
 * Selected → ember-line border + surface-3. Omit the meter for inbox candidates.
 */
export function TaskCard({
  task,
  goalColor,
  goalName,
  earnedBlocks = 0,
  selected = false,
  showMeter = true,
  onPress,
}: {
  task: Task;
  goalColor: string;
  goalName: string;
  earnedBlocks?: number;
  selected?: boolean;
  showMeter?: boolean;
  onPress?: () => void;
}) {
  const total = task.estimatedBlocks ?? 1;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        backgroundColor: selected ? color.surface3 : color.surface,
        borderWidth: 1,
        borderColor: selected ? 'rgba(240,138,62,0.45)' : color.line,
        borderRadius: 16,
        padding: 16,
      }}
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
      <Text style={text(700, { fontSize: 16, letterSpacing: -0.1, color: color.t1, marginTop: 9 })}>
        {task.title}
      </Text>
      {showMeter && <BlockMeter total={total} earned={earnedBlocks} color={goalColor} />}
    </Pressable>
  );
}
