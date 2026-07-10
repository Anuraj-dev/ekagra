import type { Session } from '@ekagra/core';
import type { ApiClient } from '../api/client';
import type { IO } from '../io';
import { bold, cyan, dim, green } from '../style';
import { formatCountdown, remainingSecondsAt } from './countdown';

/** Tunables extracted so tests can drive the loop deterministically. */
export type LiveTimerOptions = {
  /** Local render cadence in ms (default 1000). */
  tickMs?: number;
  /** Server reconcile cadence in ms (default 15000). */
  pollMs?: number;
  /** Injectable clock (default Date.now) so tests avoid real time. */
  now?: () => number;
  /** Injectable sleep so tests can step the loop. */
  wait?: (ms: number) => Promise<void>;
};

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Drives the in-place terminal countdown for a running session. Ticks locally through
 * the shared core engine and periodically re-syncs with the server so a pause/abandon
 * from another surface (web, mobile, desk device) is reflected. Auto-completes the block
 * when the timer reaches zero, mirroring the web client. Returns the terminal session.
 */
export async function runLiveTimer(
  client: ApiClient,
  io: IO,
  initial: { session: Session; serverNow: string },
  options: LiveTimerOptions = {},
): Promise<Session> {
  const tickMs = options.tickMs ?? 1000;
  const pollMs = options.pollMs ?? 15000;
  const now = options.now ?? (() => Date.now());
  const wait = options.wait ?? defaultWait;

  let session = initial.session;
  let anchorMs = Date.parse(initial.serverNow);
  let offset = anchorMs - now();
  let sincePoll = 0;

  const title = session.taskTitle ?? 'focus block';
  io.line(`${green('▶')} ${bold(title)} ${dim(`(${session.plannedMinutes}m block)`)}`);
  io.line(dim('Ctrl-C to leave it running · `ekagra pause` / `ekagra done` from anywhere'));

  const clearLine = () => {
    if (io.isTty) io.write('\r[K');
  };

  while (true) {
    const serverNowMs = now() + offset;
    const remaining = remainingSecondsAt(session, anchorMs, serverNowMs);

    if (session.status === 'paused') {
      clearLine();
      io.write(`${cyan('⏸')}  ${bold(formatCountdown(remaining))} ${dim('paused')}`);
    } else if (remaining <= 0) {
      clearLine();
      io.line(`${bold(formatCountdown(0))}  ${green('block complete — recording…')}`);
      const done = await client.sessionCommand({ action: 'complete' });
      return done.session;
    } else {
      clearLine();
      io.write(`${cyan('●')}  ${bold(formatCountdown(remaining))} ${dim('remaining')}`);
    }

    await wait(tickMs);
    sincePoll += tickMs;
    if (sincePoll >= pollMs) {
      sincePoll = 0;
      const current = await client.currentSession();
      anchorMs = Date.parse(current.serverNow);
      offset = anchorMs - now();
      if (current.session === null) {
        // Ended elsewhere (completed or abandoned) — stop cleanly.
        clearLine();
        io.line(`${dim('session ended elsewhere.')}`);
        return session;
      }
      session = current.session;
    }
  }
}
