import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { color } from '../theme/tokens';
import { text } from '../theme/typography';
import { ChevronLeftIcon } from './icons';
import { Enter } from './motion';
import { CircleButton } from './ui';

/** Editorial screen header with optional back chevron, title, sub, and right slot. */
export function ScreenHeader({
  title,
  sub,
  onBack,
  right,
  topInset = 0,
}: {
  title: string;
  sub?: string;
  onBack?: () => void;
  right?: ReactNode;
  topInset?: number;
}) {
  return (
    <Enter
      style={{
        paddingTop: 20 + topInset,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {onBack && (
        <CircleButton label="Back" onPress={onBack}>
          <ChevronLeftIcon />
        </CircleButton>
      )}
      <View style={{ flex: 1 }}>
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={text(800, { fontSize: 26, letterSpacing: -0.4, color: color.t1 })}
        >
          {title}
        </Text>
        {sub && (
          <Text style={text(600, { fontSize: 13, color: color.t3, marginTop: 3 })}>{sub}</Text>
        )}
      </View>
      {right}
    </Enter>
  );
}
