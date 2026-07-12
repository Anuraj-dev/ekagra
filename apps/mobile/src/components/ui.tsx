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
          minHeight: 52,
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
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

/** Outline pill: transparent bg, 1px `line` border, text `t2` (DESIGN-SPEC §6). Mirrors PrimaryButton. */
export function SecondaryButton({
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
          minHeight: 52,
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: pressed ? color.lineHi : color.line,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[text(700, { fontSize: 16, color: disabled ? color.t4 : color.t2 })]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

/** Compact selectable chip; ember tint by default when active (DESIGN-SPEC §6). */
export function Chip({
  label,
  active = false,
  tint = color.ember,
  onPress,
}: {
  label: string;
  active?: boolean;
  tint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: active ? color.emberWash : pressed ? color.surface3 : color.surface,
        borderColor: active ? color.emberLine : color.line,
      })}
    >
      <Text style={text(600, { fontSize: 13, color: active ? tint : color.t3 })}>{label}</Text>
    </Pressable>
  );
}

/** Recessed row shell: surface2 bg, 1px lineSoft border, r-md (settings-style rows, DESIGN-SPEC §6). */
export function EntryRow({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: color.surface2,
          borderWidth: 1,
          borderColor: color.lineSoft,
          borderRadius: 16,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
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
export function SectionRow({
  label,
  action,
  paddingHorizontal = 20,
}: {
  label: string;
  action?: ReactNode;
  paddingHorizontal?: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal,
        paddingTop: 24,
        paddingBottom: 12,
      }}
    >
      <Text style={[overline, { color: color.t3 }]}>{label}</Text>
      {action}
    </View>
  );
}
