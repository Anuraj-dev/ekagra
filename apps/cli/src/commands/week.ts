import { bold, cyan, dim, green } from '../style';
import type { CommandDeps } from './context';

/**
 * `ekagra week` — weekly review: 7-day earned blocks / honest minutes / completion
 * rate from the `rolling_rates` view, plus this week's Crew standings.
 */
export async function week(deps: CommandDeps): Promise<number> {
  const { io, client } = deps;
  const [rate, standings, me] = await Promise.all([
    client.rollingRate(7),
    client.weeklyStandings(),
    client.userId(),
  ]);

  io.line(bold('This week'));
  if (rate) {
    io.line(`  earned blocks: ${bold(String(rate.earnedBlocks))}`);
    io.line(`  honest minutes: ${bold(String(rate.honestMinutes))}`);
    if (rate.endedSessions > 0) {
      io.line(
        `  completion rate: ${bold(`${Math.round(rate.completionRate * 100)}%`)} ${dim(
          `(${rate.completedSessions}/${rate.endedSessions} sessions, 7-day window)`,
        )}`,
      );
    }
  } else {
    io.line(dim('  no sessions recorded yet.'));
  }

  if (standings.length > 0) {
    io.line();
    io.line(bold('Crew'));
    standings.forEach((standing, index) => {
      const name = standing.displayName ?? 'anonymous';
      const marker = standing.userId === me ? green('◆ you') : '';
      io.line(
        `  ${cyan(String(index + 1))}. ${name} — ${bold(String(standing.earnedBlocks))} blocks ${dim(
          `· ${standing.honestMinutes}m`,
        )} ${marker}`.trimEnd(),
      );
    });
  }
  return 0;
}
