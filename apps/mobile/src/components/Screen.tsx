import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, space } from '../theme/tokens';

/**
 * The app frame for a tabbed screen: full-bleed background, safe-area aware, with a
 * hidden-scrollbar scroll region. `focus` swaps to the darker focus background.
 * Bottom padding clears the custom tab bar when `scrolls`.
 */
export function Screen({
  children,
  focus = false,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  focus?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const bg = focus ? color.bgFocus : color.bg;

  if (!scroll) {
    // No tab-bar clearance: the only non-scroll screen (MorningCommit) is pushed,
    // not tabbed, so nothing sits under it.
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingBottom: insets.bottom }}>{children}</View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingBottom: space[10] + insets.bottom }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}
