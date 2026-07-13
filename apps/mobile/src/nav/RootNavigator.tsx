import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Capture } from '../screens/Capture';
import { EveningClose } from '../screens/EveningClose';
import { Focus } from '../screens/Focus';
import { Goals } from '../screens/Goals';
import { Insights } from '../screens/Insights';
import { MorningCommit } from '../screens/MorningCommit';
import { Settings } from '../screens/Settings';
import { Tasks } from '../screens/Tasks';
import { useTheme } from '../theme/ThemeProvider';
import { TabBar } from './TabBar';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  const t = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.canvas } }}
    >
      <Tab.Screen name="Tasks" component={Tasks} />
      <Tab.Screen name="Goals" component={Goals} />
      <Tab.Screen name="Insights" component={Insights} />
    </Tab.Navigator>
  );
}

/** Tab shell + full-screen pushed overlays. Rituals present as modals. */
export function RootNavigator() {
  const t = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.canvas },
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="Focus"
        component={Focus}
        options={{ contentStyle: { backgroundColor: t.canvas } }}
      />
      <Stack.Screen name="Capture" component={Capture} options={{ presentation: 'modal' }} />
      <Stack.Screen
        name="MorningCommit"
        component={MorningCommit}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="EveningClose"
        component={EveningClose}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="Settings" component={Settings} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
