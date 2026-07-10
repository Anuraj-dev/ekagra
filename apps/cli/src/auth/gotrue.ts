import type { CliConfig } from '../config';
import { type StoredSession, saveStoredSession } from './store';

/** Raised for auth failures so the CLI can print a clean message and exit. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

type GoTrueToken = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user?: { id: string; email: string | null };
};

function toStoredSession(token: GoTrueToken): StoredSession {
  const expiresAt = token.expires_at ?? Math.floor(Date.now() / 1000) + (token.expires_in ?? 3600);
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
    userId: token.user?.id ?? '',
    email: token.user?.email ?? null,
  };
}

async function tokenRequest(
  config: CliConfig,
  grant: 'password' | 'refresh_token',
  body: Record<string, string>,
): Promise<GoTrueToken> {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { apikey: config.anonKey, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    const message =
      (typeof data.error_description === 'string' && data.error_description) ||
      (typeof data.msg === 'string' && data.msg) ||
      (typeof data.error === 'string' && data.error) ||
      `Authentication failed (${response.status}).`;
    throw new AuthError(message);
  }
  return data as GoTrueToken;
}

/** Signs in with email + password and persists the resulting session. */
export async function signInWithPassword(
  config: CliConfig,
  email: string,
  password: string,
): Promise<StoredSession> {
  const token = await tokenRequest(config, 'password', { email, password });
  const session = toStoredSession(token);
  await saveStoredSession(session);
  return session;
}

/** Exchanges a refresh token for a fresh session and persists it. */
export async function refreshSession(
  config: CliConfig,
  refreshToken: string,
): Promise<StoredSession> {
  const token = await tokenRequest(config, 'refresh_token', { refresh_token: refreshToken });
  const session = toStoredSession(token);
  await saveStoredSession(session);
  return session;
}
