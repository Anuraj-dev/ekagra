import { Text, View } from 'react-native';
import { text } from '../theme/typography';

/** 3px color tick + goal name in that color, 12/700. Used once per row (DESIGN-SPEC §6). */
export function GoalMark({ color: tint, name }: { color: string; name: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: tint }} />
      <Text style={text(700, { fontSize: 12, color: tint })}>{name}</Text>
    </View>
  );
}
