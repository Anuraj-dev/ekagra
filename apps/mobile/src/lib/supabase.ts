import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// EXPO_PUBLIC_* is inlined by Expo at build time; the expo-constants `extra` block
// (app.config.ts) is the fallback for values injected another way.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string | null;
  supabaseAnonKey?: string | null;
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? undefined;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? undefined;

/** True when both env values are present; the app degrades to a config notice otherwise. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const SUPABASE_ANON_KEY = anonKey ?? '';

if (!isSupabaseConfigured) {
  // Surfaced in the UI (see App). Never hardcode keys — see apps/mobile/.env.example.
  console.warn(
    'Supabase env is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

/**
 * The single Supabase client. On React Native the auth session is persisted in
 * AsyncStorage (there is no localStorage), and URL-based session detection is off
 * (no browser redirect). It attaches `apikey` + `Authorization: Bearer <jwt>` to
 * every request, exactly what the verify_jwt=true edge functions require.
 */
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const FUNCTIONS_BASE = `${(url ?? '').replace(/\/$/, '')}/functions/v1`;
