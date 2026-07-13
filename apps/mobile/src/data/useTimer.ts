import {
  createTimerState,
  elapsedMs as deriveElapsedMs,
  remainingMs as deriveRemainingMs,
} from '@ekagra/core';
import { useEffect, useMemo, useState } from 'react';
import { timerStateFromSession } from '../lib/timer';
import { useCurrentSessionQuery } from './queries/useCurrentSession';

export function useTimer() {
  const query = useCurrentSessionQuery();
  const [clientNow, setClientNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setClientNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const session = query.data?.session ?? null;
  const serverNowMs = Date.parse(query.data?.serverNow ?? '') || clientNow;
  const receivedAtMs = query.dataUpdatedAt || clientNow;
  const serverClockOffset = serverNowMs - receivedAtMs;
  const state = useMemo(
    () => (session ? timerStateFromSession(session, serverNowMs) : createTimerState()),
    [session, serverNowMs],
  );
  const now = clientNow + serverClockOffset;

  return {
    state,
    remainingMs: session ? deriveRemainingMs(state, now) : 0,
    elapsedMs: session ? deriveElapsedMs(state, now) : 0,
    phase: state.phase,
    status: state.status,
  };
}
