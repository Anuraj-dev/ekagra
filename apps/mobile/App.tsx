import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { UpdateBanner } from './src/components/UpdateBanner';
import { DataProvider } from './src/data/DataProvider';
import { QueryProvider } from './src/data/queryClient';
import { loadCuePrefs } from './src/lib/cuePrefs';
import { scheduleDailyCues } from './src/lib/notifications';
import { isSupabaseConfigured } from './src/lib/supabase';
import { RootNavigator } from './src/nav/RootNavigator';
import { SignIn } from './src/screens/SignIn';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { fontAssets, text } from './src/theme/typography';

function Centered({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.canvas,
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
  const t = useTheme();
  return (
    <Centered>
      <Text style={text(800, { fontSize: 20, color: t.ink, textAlign: 'center' })}>
        Configuration needed
      </Text>
      <Text
        style={text(600, {
          fontSize: 14,
          color: t.textSecondary,
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
  const t = useTheme();
  const navBase = t.appearance === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...navBase,
    colors: {
      ...navBase.colors,
      background: t.canvas,
      card: t.canvas,
      text: t.ink,
      border: t.line,
      primary: t.accent,
      notification: t.accent,
    },
  };

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
        <ActivityIndicator color={t.accent} />
      </Centered>
    );
  }

  if (!session) return <SignIn />;

  return (
    <QueryProvider>
      <DataProvider>
        <View style={{ flex: 1 }}>
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
          <UpdateBanner />
        </View>
      </DataProvider>
    </QueryProvider>
  );
}

function AppContent({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { appearance, accent } = useTheme();

  return (
    <>
      <StatusBar style={appearance === 'dark' ? 'light' : 'dark'} />
      {!fontsLoaded ? (
        <Centered>
          <ActivityIndicator color={accent} />
        </Centered>
      ) : !isSupabaseConfigured ? (
        <ConfigNotice />
      ) : (
        <AuthProvider>
          <Gate />
        </AuthProvider>
      )}
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent fontsLoaded={fontsLoaded} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
