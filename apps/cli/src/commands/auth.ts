import { signInWithPassword } from '../auth/gotrue';
import { clearStoredSession, loadStoredSession } from '../auth/store';
import type { CliConfig } from '../config';
import type { IO } from '../io';
import { dim, green } from '../style';

/** `ekagra login [email]` — email/password sign-in; persists the session on disk. */
export async function login(config: CliConfig, io: IO, args: string[]): Promise<number> {
  const email = args[0]?.trim() || (await io.ask('email: '));
  if (!email) {
    io.error('An email address is required.');
    return 1;
  }
  const password = await io.askSecret('password: ');
  if (!password) {
    io.error('A password is required.');
    return 1;
  }
  const session = await signInWithPassword(config, email, password);
  io.line(`${green('✓')} signed in as ${session.email ?? email}.`);
  return 0;
}

/** `ekagra logout` — removes the persisted session. */
export async function logout(io: IO): Promise<number> {
  await clearStoredSession();
  io.line('signed out.');
  return 0;
}

/** `ekagra whoami` — shows the signed-in account, if any. */
export async function whoami(io: IO): Promise<number> {
  const session = await loadStoredSession();
  if (!session) {
    io.line(dim('not signed in. Run `ekagra login`.'));
    return 1;
  }
  io.line(session.email ?? session.userId);
  return 0;
}
