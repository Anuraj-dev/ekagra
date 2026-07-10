import type { CliConfig } from '../config';
import { AuthError, refreshSession } from './gotrue';
import { loadStoredSession, type StoredSession } from './store';

/** Returns a valid access token for `Authorization`, or throws if not signed in. */
export type TokenProvider = () => Promise<string>;

const REFRESH_MARGIN_SECONDS = 60;

/**
 * Builds a token provider that loads the persisted session once, then refreshes it
 * whenever it is within a minute of expiry. Mirrors supabase-js `autoRefreshToken`
 * without pulling in the SDK, keeping the CLI dependency-free.
 */
export function createTokenProvider(config: CliConfig): TokenProvider {
  let current: StoredSession | null = null;
  let loaded = false;
  /**
   * Concurrent callers (e.g. `today` fires four API calls in parallel) must share
   * one refresh: refresh tokens rotate, so parallel grants can invalidate each
   * other and race the session-file write. Memoize the in-flight promise.
   */
  let refreshing: Promise<StoredSession> | null = null;

  return async () => {
    if (!loaded) {
      current = await loadStoredSession();
      loaded = true;
    }
    if (!current) {
      throw new AuthError('Not signed in. Run `ekagra login` first.');
    }
    const now = Math.floor(Date.now() / 1000);
    if (current.expiresAt - REFRESH_MARGIN_SECONDS <= now) {
      refreshing ??= refreshSession(config, current.refreshToken).finally(() => {
        refreshing = null;
      });
      current = await refreshing;
    }
    return current.accessToken;
  };
}
