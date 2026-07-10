import type { Task } from '@ekagra/core';
import { bold, cyan, dim, green, yellow } from '../style';
import type { CommandDeps } from './context';

/** Parses "1 3 4" / "1,3,4" into unique 1-based indices. */
export function parseSelection(input: string): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const token of input.split(/[\s,]+/)) {
    if (!token) continue;
    const n = Number.parseInt(token, 10);
    if (Number.isInteger(n) && n > 0 && !seen.has(n)) {
      seen.add(n);
      result.push(n);
    }
  }
  return result;
}

/**
 * `ekagra plan` — the morning commit. Triages the inbox, lets Raja pick 1–3 tasks, and
 * commits them via the atomic `commit_morning_plan` RPC (which clears any prior plan and
 * marks the chosen tasks `planned`). Zero-friction: numbers in, plan out.
 */
export async function plan(deps: CommandDeps): Promise<number> {
  const { io, client } = deps;
  const [inbox, planned] = await Promise.all([
    client.listTasks('inbox'),
    client.listTasks('planned'),
  ]);

  if (planned.length > 0) {
    io.line(dim('Already committed today:'));
    for (const task of planned) io.line(`  ${green('•')} ${task.title}`);
    io.line();
  }

  const candidates: Task[] = [...planned, ...inbox];
  if (candidates.length === 0) {
    io.line(dim('Inbox is empty. Capture something first: ekagra capture "..."'));
    return 0;
  }

  io.line(bold('Pick 1–3 tasks to commit to today:'));
  candidates.forEach((task, index) => {
    const tag = task.status === 'planned' ? green(' (planned)') : '';
    io.line(`  ${cyan(String(index + 1).padStart(2))}. ${task.title}${tag}`);
  });

  const answer = await io.ask(`${bold('> ')}`);
  const picks = parseSelection(answer);
  if (picks.length === 0) {
    io.line(dim('Nothing selected — plan unchanged.'));
    return 0;
  }
  if (picks.length > 3) {
    io.error(yellow('Pick at most 3 tasks.'));
    return 1;
  }

  const ids: string[] = [];
  for (const pick of picks) {
    const task = candidates[pick - 1];
    if (!task) {
      io.error(yellow(`No task at #${pick}.`));
      return 1;
    }
    if (!ids.includes(task.id)) ids.push(task.id);
  }

  await client.commitMorning(ids as [string, ...string[]]);
  io.line(`${green('✓')} committed ${ids.length} task${ids.length === 1 ? '' : 's'} for today.`);
  io.line(dim('Start when ready: ekagra start'));
  return 0;
}
