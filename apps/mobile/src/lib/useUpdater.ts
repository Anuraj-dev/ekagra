import { useCallback, useRef, useState } from 'react';
import {
  type AvailableUpdate,
  checkForUpdate,
  downloadAndInstall,
  type UpdateState,
} from './updates';

/**
 * Shared state machine driver for the in-app updater. The launch banner and
 * the Settings "check for updates" row both consume this so they render the
 * same Idle -> Checking -> UpdateAvailable -> Downloading -> Verifying ->
 * Installing progression (plus error states) without duplicating transitions.
 */
export function useUpdater() {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' });
  const busy = useRef(false);
  const pending = useRef<AvailableUpdate | null>(null);

  /** Runs a check. Silent mode collapses "no update" back to idle. */
  const check = useCallback(async (options?: { silent?: boolean }) => {
    if (busy.current) return null;
    busy.current = true;
    setState({ phase: 'checking' });
    const update = await checkForUpdate();
    pending.current = update;
    setState(
      update
        ? { phase: 'update-available', update }
        : options?.silent
          ? { phase: 'idle' }
          : { phase: 'up-to-date' },
    );
    busy.current = false;
    return update;
  }, []);

  /** Downloads, verifies, and installs the update found by the last check. */
  const install = useCallback(async () => {
    const update = pending.current;
    if (!update || busy.current) return;
    busy.current = true;
    await downloadAndInstall(update, setState);
    busy.current = false;
  }, []);

  const reset = useCallback(() => {
    if (!busy.current) {
      pending.current = null;
      setState({ phase: 'idle' });
    }
  }, []);

  return { state, check, install, reset };
}
