import { chmod, mkdir, rm } from 'node:fs/promises';
import { configDir, sessionPath } from '../config';

/** The persisted Supabase session, written under ~/.config/ekagra/session.json. */
export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds at which accessToken expires. */
  expiresAt: number;
  userId: string;
  email: string | null;
};

export async function loadStoredSession(): Promise<StoredSession | null> {
  try {
    const file = Bun.file(sessionPath());
    if (!(await file.exists())) return null;
    const raw = (await file.json()) as Partial<StoredSession>;
    if (!raw.accessToken || !raw.refreshToken || typeof raw.expiresAt !== 'number') return null;
    return {
      accessToken: raw.accessToken,
      refreshToken: raw.refreshToken,
      expiresAt: raw.expiresAt,
      userId: raw.userId ?? '',
      email: raw.email ?? null,
    };
  } catch {
    return null;
  }
}

/** Persists the session with owner-only permissions (0600) since it holds tokens. */
export async function saveStoredSession(session: StoredSession): Promise<void> {
  await mkdir(configDir(), { recursive: true });
  const path = sessionPath();
  await Bun.write(path, `${JSON.stringify(session, null, 2)}\n`);
  await chmod(path, 0o600);
}

export async function clearStoredSession(): Promise<void> {
  await rm(sessionPath(), { force: true });
}
