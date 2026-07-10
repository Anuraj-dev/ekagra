import type { ReactNode } from 'react';
import { Pressable, type StyleProp, Text, View, type ViewStyle } from 'react-native';
import { color } from '../theme/tokens';
import { overline, text } from '../theme/typography';

/** Filled ember pill; disabled → the hard-block "well" treatment (DESIGN-SPEC §6). */
export function PrimaryButton({
  children,
  disabled,
  onPress,
  style,
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: 999,
          paddingVertical: 17,
          paddingHorizontal: 20,
          width: '100%',
          alignItems: 'center',
          backgroundColor: disabled ? color.lineSoft : pressed ? color.emberHi : color.ember,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[text(800, { fontSize: 16, color: disabled ? color.t4 : color.bg })]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

/** Text-only ember action, no chrome. */
export function GhostButton({
  children,
  onPress,
  tint = color.ember,
}: {
  children: string;
  onPress?: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={text(700, { fontSize: 13, color: tint })}>{children}</Text>
    </Pressable>
  );
}

/** 38–40px circular header/close control (settings, back chevron). */
export function CircleButton({
  children,
  size = 40,
  onPress,
  label,
}: {
  children: ReactNode;
  size?: number;
  onPress?: () => void;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: pressed ? color.lineHi : color.line,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {children}
    </Pressable>
  );
}

/** Section overline row with an optional right-aligned action. */
export function SectionRow({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 12,
      }}
    >
      <Text style={[overline, { color: color.t3 }]}>{label}</Text>
      {action}
    </View>
  );
}
