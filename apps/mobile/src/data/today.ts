import type { Task, TodayPlan } from '@ekagra/core';

/** The Tasks screen renders this server-owned set, not scheduled_for guesses. */
export function committedTodayTasks(today: TodayPlan | undefined): Task[] {
  return (
    today?.commitments.flatMap((commitment) => (commitment.task ? [commitment.task] : [])) ?? []
  );
}
