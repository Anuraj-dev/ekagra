import { DISTRACTION_TAGS, type DistractionTag, type Task } from '@ekagra/core';
import { runLiveTimer } from '../render/live';
import { bold, cyan, dim, green, yellow } from '../style';
import type { CommandDeps } from './context';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function resolveTask(deps: CommandDeps, planned: Task[], arg?: string): Promise<Task | null> {
  const { io } = deps;
  if (planned.length === 0) {
    io.line(dim('No planned tasks. Run `ekagra plan` to commit your day first.'));
    return null;
  }
  if (arg) {
    if (isUuid(arg)) return planned.find((t) => t.id === arg) ?? null;
    const index = Number.parseInt(arg, 10);
    if (Number.isInteger(index) && index >= 1 && index <= planned.length) return planned[index - 1];
    io.error(yellow(`No planned task matching "${arg}".`));
    return null;
  }
  if (planned.length === 1) return planned[0];

  io.line(bold('Which task?'));
  planned.forEach((task, index) => {
    io.line(`  ${cyan(String(index + 1).padStart(2))}. ${task.title}`);
  });
  const answer = await io.ask(`${bold('> ')}`);
  const index = Number.parseInt(answer, 10);
  return Number.isInteger(index) && index >= 1 && index <= planned.length
    ? planned[index - 1]
    : null;
}

/** `ekagra start [n|taskId]` — starts a focus block on a planned task, then counts down. */
export async function start(deps: CommandDeps, args: string[]): Promise<number> {
  const { io, client } = deps;
  const current = await client.currentSession();
  if (
    current.session &&
    (current.session.status === 'running' || current.session.status === 'paused')
  ) {
    io.line(
      yellow('A session is already active. `ekagra today` to see it, `ekagra done` to finish.'),
    );
    return 1;
  }

  const planned = await client.listTasks('planned');
  const task = await resolveTask(deps, planned, args[0]);
  if (!task) return 1;

  const started = await client.startSession({ taskId: task.id });
  const ended = await runLiveTimer(client, io, started);
  io.line();
  if (ended.status === 'completed') {
    io.line(`${green('✓')} block earned. ${dim(`${ended.honestMinutes} honest minutes.`)}`);
  } else if (ended.status === 'abandoned') {
    io.line(dim(`session ended (${ended.distractionTag ?? 'abandoned'}).`));
  }
  return 0;
}

/** `ekagra pause` — pauses the active session. */
export async function pause(deps: CommandDeps): Promise<number> {
  const res = await deps.client.sessionCommand({ action: 'pause' });
  deps.io.line(`${cyan('⏸')} paused at ${bold(fmt(res.session.remainingSeconds))} remaining.`);
  deps.io.line(dim('Pick it back up with `ekagra resume`.'));
  return 0;
}

/** `ekagra resume` — resumes a paused session and returns to the live countdown. */
export async function resume(deps: CommandDeps): Promise<number> {
  const res = await deps.client.sessionCommand({ action: 'resume' });
  const ended = await runLiveTimer(deps.client, deps.io, res);
  deps.io.line();
  if (ended.status === 'completed') {
    deps.io.line(`${green('✓')} block earned. ${dim(`${ended.honestMinutes} honest minutes.`)}`);
  }
  return 0;
}

/** `ekagra done` — completes the active block. The server enforces "must reach zero". */
export async function done(deps: CommandDeps): Promise<number> {
  const res = await deps.client.sessionCommand({ action: 'complete' });
  if (res.session.earnedBlock) {
    deps.io.line(
      `${green('✓')} block earned. ${dim(`${res.session.honestMinutes} honest minutes.`)}`,
    );
  } else {
    deps.io.line(`${green('✓')} done. ${dim(`${res.session.honestMinutes} honest minutes.`)}`);
  }
  return 0;
}

/** `ekagra abandon [tag]` — abandons the active block with a distraction reason. */
export async function abandon(deps: CommandDeps, args: string[]): Promise<number> {
  const { io, client } = deps;
  let tag = args[0] as DistractionTag | undefined;
  if (!tag || !DISTRACTION_TAGS.includes(tag)) {
    io.line(`Reason? ${dim(DISTRACTION_TAGS.join(' · '))}`);
    const answer = (await io.ask(`${bold('> ')}`)) as DistractionTag;
    if (!DISTRACTION_TAGS.includes(answer)) {
      io.error(yellow(`Reason must be one of: ${DISTRACTION_TAGS.join(', ')}.`));
      return 1;
    }
    tag = answer;
  }
  const res = await client.sessionCommand({ action: 'abandon', distractionTag: tag });
  io.line(
    `${dim('abandoned')} (${tag}). ${dim(`${res.session.honestMinutes} honest minutes kept.`)}`,
  );
  return 0;
}

function fmt(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
