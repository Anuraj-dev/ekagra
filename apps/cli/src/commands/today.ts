import { formatCountdown, remainingSecondsAt } from '../render/countdown';
import { bold, cyan, dim, green } from '../style';
import type { CommandDeps } from './context';

/**
 * `ekagra today` — today's committed plan, the active session, earned blocks and
 * honest minutes so far, plus the 7-day rolling completion rate.
 */
export async function today(deps: CommandDeps): Promise<number> {
  const { io, client } = deps;
  const [todayPlan, current, stats, rate] = await Promise.all([
    client.todayPlan(),
    client.currentSession(),
    client.todayStats(),
    client.rollingRate(7),
  ]);
  const planned = todayPlan.commitments.flatMap((commitment) =>
    commitment.task ? [commitment.task] : [],
  );

  io.line(bold('Today'));
  if (planned.length === 0) {
    io.line(dim('  no plan committed — run `ekagra plan`.'));
  } else {
    planned.forEach((task, index) => {
      io.line(`  ${cyan(String(index + 1))}. ${task.title}`);
    });
  }

  io.line();
  if (current.session) {
    const remaining = remainingSecondsAt(
      current.session,
      Date.parse(current.serverNow),
      Date.parse(current.serverNow),
    );
    const label = current.session.status === 'paused' ? 'paused' : 'running';
    io.line(
      `  ${green('●')} ${current.session.taskTitle ?? 'focus block'} — ${bold(
        formatCountdown(remaining),
      )} ${dim(label)}`,
    );
  } else {
    io.line(dim('  no active session.'));
  }

  io.line();
  io.line(
    `  blocks: ${bold(String(stats.earnedBlocks))} · honest minutes: ${bold(
      String(stats.honestMinutes),
    )}`,
  );
  if (rate && rate.endedSessions > 0) {
    io.line(
      `  7-day rate: ${bold(`${Math.round(rate.completionRate * 100)}%`)} ${dim(
        `(${rate.completedSessions}/${rate.endedSessions} sessions)`,
      )}`,
    );
  }
  return 0;
}
