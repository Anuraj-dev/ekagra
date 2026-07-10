import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Crew } from '../screens/Crew';
import { EveningClose } from '../screens/EveningClose';
import { Focus } from '../screens/Focus';
import { Goals } from '../screens/Goals';
import { Insights } from '../screens/Insights';
import { MorningCommit } from '../screens/MorningCommit';
import { Settings } from '../screens/Settings';
import { Tasks } from '../screens/Tasks';
import { Today } from '../screens/Today';
import { color } from '../theme/tokens';
import { TabBar } from './TabBar';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}
    >
      <Tab.Screen name="Today" component={Today} />
      <Tab.Screen name="Goals" component={Goals} />
      <Tab.Screen name="Insights" component={Insights} />
      <Tab.Screen name="Crew" component={Crew} />
      <Tab.Screen name="Tasks" component={Tasks} />
    </Tab.Navigator>
  );
}

/** Tab shell + full-screen pushed overlays. Rituals present as modals. */
export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}
    >
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="Focus"
        component={Focus}
        options={{ contentStyle: { backgroundColor: color.bgFocus } }}
      />
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
