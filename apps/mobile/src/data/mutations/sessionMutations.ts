import {
  type CurrentSessionResponse,
  DEFAULT_TIMER_DURATIONS,
  type DistractionTag,
  type Session,
  type SessionCommand,
  type SessionResponse,
  type Task,
} from '@ekagra/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useCallback } from 'react';
import { sessionsApi } from '../../lib/api';
import { qk } from '../keys';
import type { MutationResult } from './types';

type StartInput = { taskId: string };
type StartVariables = StartInput & { clientOpId: string };
type CachedCurrentSessionResponse = Omit<CurrentSessionResponse, 'session'> & {
  session: (Session & { syncing?: boolean }) | null;
};
type CommandInput = {
  action: 'pause' | 'resume' | 'complete' | 'completeEarly' | 'abandon';
  distractionTag?: DistractionTag;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Session request timed out.')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function useStartSession(): MutationResult<StartInput> {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ taskId, clientOpId }: StartVariables) =>
      withTimeout(
        sessionsApi.start({ taskId, clientOpId, durations: DEFAULT_TIMER_DURATIONS }),
        9_000,
      ),
    onMutate: async ({ taskId }) => {
      await client.cancelQueries({ queryKey: qk.session });
      const previous = client.getQueryData<CurrentSessionResponse>(qk.session);
      const task = client.getQueryData<Task[]>(qk.tasks)?.find((item) => item.id === taskId);
      const serverNow = new Date().toISOString();
      client.setQueryData<CachedCurrentSessionResponse>(qk.session, {
        serverNow,
        session: {
          id: `syncing-session-${Crypto.randomUUID()}`,
          taskId,
          taskTitle: task?.title,
          plannedMinutes: DEFAULT_TIMER_DURATIONS.workMinutes,
          startedAt: serverNow,
          pausedAt: null,
          endedAt: null,
          status: 'running',
          elapsedSeconds: 0,
          remainingSeconds: DEFAULT_TIMER_DURATIONS.workMinutes * 60,
          honestMinutes: 0,
          earnedBlock: false,
          distractionTag: null,
          syncing: true,
        },
      });
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(qk.session, context?.previous),
    onSuccess: (response) => client.setQueryData(qk.session, response),
    onSettled: () => client.invalidateQueries({ queryKey: qk.session, refetchType: 'none' }),
  });
  const mutate = useCallback(
    (input: StartInput) => mutation.mutate({ ...input, clientOpId: Crypto.randomUUID() }),
    [mutation.mutate],
  );
  return {
    mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

function commandPayload(input: CommandInput): SessionCommand {
  if (input.action !== 'abandon') return { action: input.action };
  // TODO(slice-2): abandon should collect a distraction tag in the UI
  return { action: 'abandon', distractionTag: input.distractionTag ?? 'interruption' };
}

function optimisticCommand(
  current: CurrentSessionResponse | undefined,
  input: CommandInput,
): CurrentSessionResponse | undefined {
  if (!current?.session) return current;
  const serverNow = new Date().toISOString();
  if (
    input.action === 'complete' ||
    input.action === 'completeEarly' ||
    input.action === 'abandon'
  ) {
    return { session: null, serverNow };
  }
  return {
    serverNow,
    session: {
      ...current.session,
      status: input.action === 'pause' ? 'paused' : 'running',
      pausedAt: input.action === 'pause' ? serverNow : null,
    },
  };
}

export function useSessionCommand(): MutationResult<CommandInput> {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: CommandInput) => sessionsApi.command(commandPayload(input)),
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: qk.session });
      const previous = client.getQueryData<CurrentSessionResponse>(qk.session);
      client.setQueryData(qk.session, optimisticCommand(previous, input));
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(qk.session, context?.previous),
    onSuccess: (response: SessionResponse) => {
      const ended =
        response.session.status === 'completed' || response.session.status === 'abandoned';
      client.setQueryData<CurrentSessionResponse>(qk.session, {
        session: ended ? null : response.session,
        serverNow: response.serverNow,
      });
      if (ended) void client.invalidateQueries({ queryKey: qk.tasks });
    },
    onSettled: () => client.invalidateQueries({ queryKey: qk.session, refetchType: 'none' }),
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
