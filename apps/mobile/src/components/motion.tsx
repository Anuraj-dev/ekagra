import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

/**
 * Screen-enter motion (DESIGN-SPEC §7): content fade + 8px rise, 320ms, with a single
 * header→body stagger via `delay`. `ReduceMotion.System` honors the OS reduce-motion
 * setting — the transform is skipped and content appears instantly.
 */
export function Enter({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(320).delay(delay).reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}
