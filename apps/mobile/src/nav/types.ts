import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** Five tabs (DESIGN-SPEC §6) — the persistent bottom navigation. */
export type TabParamList = {
  Today: undefined;
  Goals: undefined;
  Insights: undefined;
  Crew: undefined;
  Tasks: undefined;
};

/** Root stack: the tab shell plus the pushed full-screen overlays / rituals. */
export type RootStackParamList = {
  Tabs: undefined;
  Focus: undefined;
  MorningCommit: undefined;
  EveningClose: undefined;
  Settings: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
export type TabNav = BottomTabNavigationProp<TabParamList>;

export const TABS: { route: keyof TabParamList; label: string }[] = [
  { route: 'Today', label: 'Today' },
  { route: 'Goals', label: 'Goals' },
  { route: 'Insights', label: 'Insights' },
  { route: 'Crew', label: 'Crew' },
  { route: 'Tasks', label: 'Tasks' },
];
