export type SessionOutcome = 'completed' | 'abandoned';

export type SessionAccounting = {
  honestMinutes: number;
  earnedBlock: boolean;
};

/** The hard-block rule: a focus session always belongs to a task. */
export function canStartFocusSession(taskId: string | null | undefined): taskId is string {
  return typeof taskId === 'string' && taskId.trim().length > 0;
}

/** Shared accounting seam used by every client; the database repeats the invariant. */
export function accountSession(outcome: SessionOutcome, elapsedMinutes: number): SessionAccounting {
  return {
    honestMinutes: Math.max(0, Math.floor(elapsedMinutes)),
    earnedBlock: outcome === 'completed',
  };
}
