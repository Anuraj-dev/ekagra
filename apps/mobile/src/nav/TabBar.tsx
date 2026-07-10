import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CrewIcon, GoalsIcon, InsightsIcon, TasksIcon, TodayIcon } from '../components/icons';
import { color } from '../theme/tokens';
import { text } from '../theme/typography';
import type { TabParamList } from './types';

const ICONS: Record<keyof TabParamList, ComponentType<{ tint?: string }>> = {
  Today: TodayIcon,
  Goals: GoalsIcon,
  Insights: InsightsIcon,
  Crew: CrewIcon,
  Tasks: TasksIcon,
};

/** Solid flat tab bar, hairline top, active-tab tick indicator (DESIGN-SPEC §6). */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: color.bg,
        borderTopWidth: 1,
        borderTopColor: color.line,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingTop: 4,
      }}
    >
      {state.routes.map((route, index) => {
        const active = state.index === index;
        const routeName = route.name as keyof TabParamList;
        const Icon = ICONS[routeName];
        const tint = active ? color.ember : color.t4;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={active ? { selected: true } : {}}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{
              flex: 1,
              height: 64,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 6,
                width: 16,
                height: 3,
                borderRadius: 2,
                backgroundColor: active ? color.ember : 'transparent',
              }}
            />
            <Icon tint={tint} />
            <Text style={text(700, { fontSize: 11, color: tint })}>{routeName}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
