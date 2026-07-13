import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoalsIcon, InsightsIcon, TasksIcon } from '../components/icons';
import { useTheme } from '../theme/ThemeProvider';
import { ui } from '../theme/typography';
import type { TabParamList } from './types';

const ICONS = { Tasks: TasksIcon, Goals: GoalsIcon, Insights: InsightsIcon };

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const routes = state.routes as { key: string; name: keyof TabParamList }[];
  const go = (route: (typeof routes)[number]) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name);
  };
  return (
    <View
      style={{
        backgroundColor: t.navBar,
        borderTopWidth: 1,
        borderTopColor: t.lineSoft,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
      }}
    >
      <View style={{ height: 68, flexDirection: 'row', alignItems: 'center' }}>
        {routes.slice(0, 2).map((route, index) => (
          <TabItem
            key={route.key}
            route={route}
            active={state.index === index}
            onPress={() => go(route)}
            t={t}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture a task"
          onPress={() => navigation.getParent()?.navigate('Capture' as never)}
          style={({ pressed }) => [
            {
              width: 60,
              height: 60,
              borderRadius: t.radii.lg,
              backgroundColor: pressed ? t.accentPressed : t.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: 8,
              marginTop: -26,
            },
            t.elevationNative.fabAccent,
          ]}
        >
          <Text style={ui(400, { color: t.inkOnDark, fontSize: 34, lineHeight: 38 })}>+</Text>
        </Pressable>
        {routes.slice(2).map((route, index) => (
          <TabItem
            key={route.key}
            route={route}
            active={state.index === index + 2}
            onPress={() => go(route)}
            t={t}
          />
        ))}
      </View>
    </View>
  );
}

function TabItem({
  route,
  active,
  onPress,
  t,
}: {
  route: { key: string; name: keyof TabParamList };
  active: boolean;
  onPress: () => void;
  t: ReturnType<typeof useTheme>;
}) {
  const Icon = ICONS[route.name];
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          minWidth: 56,
          height: 30,
          borderRadius: t.radii.pill,
          backgroundColor: active ? t.lineSoft : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon tint={active ? t.ink : t.textSecondary} />
      </View>
      <Text
        style={ui(600, { color: active ? t.ink : t.textSecondary, fontSize: 11, marginTop: 2 })}
      >
        {route.name}
      </Text>
    </Pressable>
  );
}
