import type { Session as AuthSession } from '@supabase/supabase-js';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { qk } from '../data/keys';
import {
  clearUserQueryState,
  queryClient,
  readCacheOwner,
  rememberCacheOwner,
} from '../data/queryClient';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncOwnerTimeZone(ownerId: string): Promise<boolean> {
  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZone = typeof resolved === 'string' && resolved.length > 0 ? resolved : 'UTC';
  const { error } = await supabase
    .from('profiles')
    .update({ time_zone: timeZone })
    .eq('id', ownerId);
  if (error) {
    console.error('Could not update the owner time zone.', error);
    return false;
  }
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const ownerId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let transition = 0;
    const applySession = async (next: AuthSession | null) => {
      const currentTransition = ++transition;
      const nextOwnerId = next?.user.id ?? null;
      // On cold boot the ref is unknown, so fall back to the persisted cache owner:
      // a same-user boot keeps its cache (offline/instant start); any real identity
      // change still wipes it before the new account renders.
      const previousOwnerId =
        ownerId.current === undefined ? await readCacheOwner() : ownerId.current;
      if (!active || currentTransition !== transition) return;
      if (previousOwnerId !== nextOwnerId) {
        setLoading(true);
        try {
          await clearUserQueryState();
        } catch (error) {
          // Do not render a new account if its predecessor's persisted cache could not be erased.
          console.error('Could not clear the account query cache.', error);
          return;
        }
      }
      if (!active || currentTransition !== transition) return;
      ownerId.current = nextOwnerId;
      await rememberCacheOwner(nextOwnerId);
      if (!active || currentTransition !== transition) return;
      setSession(next);
      setLoading(false);
      if (nextOwnerId) {
        void syncOwnerTimeZone(nextOwnerId).then((synced) => {
          if (!synced || !active || currentTransition !== transition) return;
          void queryClient.invalidateQueries({ queryKey: qk.todayPlan });
        });
      }
    };
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void applySession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      signOut: async () => {
        await clearUserQueryState();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
