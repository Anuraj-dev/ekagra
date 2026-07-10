import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when both env values are present; the app degrades to a config notice otherwise. */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Surfaced in the UI (see App). Never hardcode keys — see apps/web/.env.example.
  console.warn('Supabase env is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

/**
 * The single Supabase client. It manages the auth session and automatically
 * attaches `apikey` and `Authorization: Bearer <jwt>` to every request, which is
 * exactly what the edge functions (verify_jwt=true) require.
 */
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const FUNCTIONS_BASE = `${(url ?? '').replace(/\/$/, '')}/functions/v1`;
