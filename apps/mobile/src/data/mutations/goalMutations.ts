import type { Goal, GoalCreateRequest, GoalUpdateRequest, Task } from '@ekagra/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useCallback, useRef } from 'react';
import { goalsApi } from '../../lib/api';
import { qk } from '../keys';
import type { MutationResult, RetryableMutationResult } from './types';

type CachedGoal = Goal & { syncing?: boolean };
type CreateVariables = GoalCreateRequest & { clientOpId: string; optimisticId: string };

export function useCreateGoal(): RetryableMutationResult<GoalCreateRequest> {
  const client = useQueryClient();
  const currentOperation = useRef<CreateVariables | null>(null);
  const mutation = useMutation({
    mutationFn: ({ optimisticId: _optimisticId, ...payload }: CreateVariables) =>
      goalsApi.create(payload),
    onMutate: async (variables) => {
      await client.cancelQueries({ queryKey: qk.goals });
      const previous = client.getQueryData<CachedGoal[]>(qk.goals);
      const now = new Date().toISOString();
      const provisional: CachedGoal = {
        id: variables.optimisticId,
        title: variables.title,
        identityRole: variables.identityRole,
        deadline: variables.deadline ?? null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        priority: variables.priority ?? null,
        syncing: true,
      };
      client.setQueryData<CachedGoal[]>(qk.goals, (goals = []) => [...goals, provisional]);
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(qk.goals, context?.previous),
    onSuccess: (goal, variables) => {
      client.setQueryData<CachedGoal[]>(qk.goals, (goals = []) =>
        goals.map((item) => (item.id === variables.optimisticId ? goal : item)),
      );
      if (currentOperation.current?.clientOpId === variables.clientOpId) {
        currentOperation.current = null;
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: qk.goals }),
  });
  const mutate = useCallback(
    (input: GoalCreateRequest) => {
      const variables =
        currentOperation.current ??
        (() => {
          const clientOpId = input.clientOpId ?? Crypto.randomUUID();
          return { ...input, clientOpId, optimisticId: `syncing-goal-${clientOpId}` };
        })();
      currentOperation.current = variables;
      mutation.mutate(variables);
    },
    [mutation.mutate],
  );
  const retry = useCallback(() => {
    if (currentOperation.current) mutation.mutate(currentOperation.current);
  }, [mutation.mutate]);
  const reset = useCallback(() => {
    currentOperation.current = null;
    mutation.reset();
  }, [mutation.reset]);
  return {
    mutate,
    retry,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset,
  };
}

export function useUpdateGoal(): MutationResult<{ id: string; patch: GoalUpdateRequest }> {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: GoalUpdateRequest }) =>
      goalsApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await client.cancelQueries({ queryKey: qk.goals });
      const previous = client.getQueryData<CachedGoal[]>(qk.goals);
      client.setQueryData<CachedGoal[]>(qk.goals, (goals = []) =>
        goals.map((goal) => (goal.id === id ? { ...goal, ...patch, syncing: true } : goal)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(qk.goals, context?.previous),
    onSuccess: (updated) => {
      client.setQueryData<CachedGoal[]>(qk.goals, (goals = []) =>
        goals.map((goal) => (goal.id === updated.id ? updated : goal)),
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: qk.goals }),
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

export function useDeleteGoal(): MutationResult<string> {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onMutate: async (id) => {
      await Promise.all([
        client.cancelQueries({ queryKey: qk.goals }),
        client.cancelQueries({ queryKey: qk.tasks }),
      ]);
      const previousGoals = client.getQueryData<CachedGoal[]>(qk.goals);
      const previousTasks = client.getQueryData<Task[]>(qk.tasks);
      client.setQueryData<CachedGoal[]>(qk.goals, (goals = []) =>
        goals.filter((goal) => goal.id !== id),
      );
      client.setQueryData<Task[]>(qk.tasks, (tasks = []) =>
        tasks.map((task) => (task.goalId === id ? { ...task, goalId: null } : task)),
      );
      return { previousGoals, previousTasks };
    },
    onError: (_error, _variables, context) => {
      client.setQueryData(qk.goals, context?.previousGoals);
      client.setQueryData(qk.tasks, context?.previousTasks);
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: qk.goals }),
        client.invalidateQueries({ queryKey: qk.tasks }),
      ]);
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
