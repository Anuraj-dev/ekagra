import { green } from '../style';
import type { CommandDeps } from './context';

/**
 * `ekagra capture "..."` — drops a zero-field task straight into the inbox. The server
 * defaults status to `inbox`; this is the fastest possible path from thought to captured.
 */
export async function capture(deps: CommandDeps, args: string[]): Promise<number> {
  const title = args.join(' ').trim();
  if (!title) {
    deps.io.error('Usage: ekagra capture "<what to remember>"');
    return 1;
  }
  const task = await deps.client.createTask({ title });
  deps.io.line(`${green('✓')} captured: ${task.title}`);
  return 0;
}
