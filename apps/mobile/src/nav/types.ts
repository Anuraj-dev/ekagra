import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** v2 persistent bottom navigation. Capture is a stack modal, not a tab. */
export type TabParamList = {
  Tasks: undefined;
  Goals: undefined;
  Insights: undefined;
};

/** Root stack: the tab shell plus the pushed full-screen overlays / rituals. */
export type RootStackParamList = {
  Tabs: undefined;
  Focus: undefined;
  Capture: undefined;
  MorningCommit: undefined;
  EveningClose: undefined;
  Settings: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
export type TabNav = BottomTabNavigationProp<TabParamList>;

export const TABS: { route: keyof TabParamList; label: string }[] = [
  { route: 'Tasks', label: 'Tasks' },
  { route: 'Goals', label: 'Goals' },
  { route: 'Insights', label: 'Insights' },
];
