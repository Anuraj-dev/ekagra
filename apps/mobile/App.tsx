import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { UpdateBanner } from './src/components/UpdateBanner';
import { DataProvider } from './src/data/DataProvider';
import { loadCuePrefs } from './src/lib/cuePrefs';
import { scheduleDailyCues } from './src/lib/notifications';
import { isSupabaseConfigured } from './src/lib/supabase';
import { RootNavigator } from './src/nav/RootNavigator';
import { SignIn } from './src/screens/SignIn';
import { color } from './src/theme/tokens';
import { fontAssets, text } from './src/theme/typography';

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: color.bg,
    card: color.bg,
    text: color.t1,
    border: color.line,
    primary: color.ember,
    notification: color.ember,
  },
};

function Centered({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: color.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      {children}
    </View>
  );
}

/** Shown when Supabase env is missing — the app can't talk to its backend. */
function ConfigNotice() {
  return (
    <Centered>
      <Text style={text(800, { fontSize: 20, color: color.t1, textAlign: 'center' })}>
        Configuration needed
      </Text>
      <Text
        style={text(600, {
          fontSize: 14,
          color: color.t3,
          marginTop: 12,
          textAlign: 'center',
          lineHeight: 21,
        })}
      >
        Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in a .env file, then reload.
        See apps/mobile/.env.example.
      </Text>
    </Centered>
  );
}

function Gate() {
  const { session, loading } = useAuth();

  // Local daily cues are scheduled once the user is authenticated, using the
  // user's chosen cue times (defaults until they change them in Settings).
  useEffect(() => {
    if (!session) return;
    void (async () => {
      const prefs = await loadCuePrefs();
      await scheduleDailyCues(prefs.morning, prefs.evening);
    })();
  }, [session]);

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator color={color.ember} />
      </Centered>
    );
  }

  if (!session) return <SignIn />;

  return (
    <DataProvider>
      <View style={{ flex: 1 }}>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
        <UpdateBanner />
      </View>
    </DataProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {!fontsLoaded ? (
          <Centered>
            <ActivityIndicator color={color.ember} />
          </Centered>
        ) : !isSupabaseConfigured ? (
          <ConfigNotice />
        ) : (
          <AuthProvider>
            <Gate />
          </AuthProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
