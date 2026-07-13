import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient, useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ekagra-query-cache-v2',
  throttleTime: 1_000,
});

/**
 * Records which account the persisted cache belongs to, so a same-user cold boot
 * can keep its cache (offline/instant start) while any identity change wipes it.
 */
const CACHE_OWNER_KEY = 'ekagra-cache-owner-v2';

export async function readCacheOwner(): Promise<string | null> {
  return AsyncStorage.getItem(CACHE_OWNER_KEY);
}

export async function rememberCacheOwner(ownerId: string | null): Promise<void> {
  if (ownerId === null) await AsyncStorage.removeItem(CACHE_OWNER_KEY);
  else await AsyncStorage.setItem(CACHE_OWNER_KEY, ownerId);
}

/** Erase all owner-scoped server state before a different auth identity can render. */
export async function clearUserQueryState(): Promise<void> {
  queryClient.clear();
  await queryPersister.removeClient();
  await AsyncStorage.removeItem(CACHE_OWNER_KEY);
}

function RestoreGate({ children }: { children: ReactNode }) {
  return useIsRestoring() ? null : children;
}

function NativeFocusManager() {
  useEffect(() => {
    const onAppStateChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => {
        setOnline(state.isConnected === true && state.isInternetReachable !== false);
      }),
    );
    return () => onlineManager.setEventListener(() => undefined);
  }, []);

  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        buster: 'wave-2b-v1',
      }}
    >
      <NativeFocusManager />
      <RestoreGate>{children}</RestoreGate>
    </PersistQueryClientProvider>
  );
}
