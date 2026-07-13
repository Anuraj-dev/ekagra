import type { Task, TaskCreateRequest, TaskUpdateRequest } from '@ekagra/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useCallback } from 'react';
import { tasksApi } from '../../lib/api';
import { qk } from '../keys';
import type { MutationResult } from './types';

type CachedTask = Task & { syncing?: boolean };
type CreateVariables = TaskCreateRequest & { clientOpId: string; optimisticId: string };

export function useCreateTask(): MutationResult<TaskCreateRequest> {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ optimisticId: _optimisticId, ...payload }: CreateVariables) =>
      tasksApi.create(payload),
    onMutate: async (variables) => {
      await client.cancelQueries({ queryKey: qk.tasks });
      const previous = client.getQueryData<CachedTask[]>(qk.tasks);
      const now = new Date().toISOString();
      const provisional: CachedTask = {
        id: variables.optimisticId,
        title: variables.title,
        status: variables.scheduledFor ? 'planned' : 'inbox',
        goalId: variables.goalId ?? null,
        estimatedBlocks: variables.estimatedBlocks ?? null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
        priority: variables.priority ?? null,
        scheduledFor: variables.scheduledFor ?? null,
        scheduledTime: variables.scheduledTime ?? null,
        deadline: variables.deadline ?? null,
        notes: variables.notes ?? null,
        syncing: true,
      };
      client.setQueryData<CachedTask[]>(qk.tasks, (tasks = []) => [...tasks, provisional]);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      client.setQueryData(qk.tasks, context?.previous);
    },
    onSuccess: (task, variables) => {
      client.setQueryData<CachedTask[]>(qk.tasks, (tasks = []) =>
        tasks.map((item) => (item.id === variables.optimisticId ? task : item)),
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: qk.tasks }),
  });
  const mutate = useCallback(
    (input: TaskCreateRequest) => {
      const clientOpId = Crypto.randomUUID();
      mutation.mutate({ ...input, clientOpId, optimisticId: `syncing-task-${clientOpId}` });
    },
    [mutation.mutate],
  );
  return {
    mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

export function useUpdateTask(): MutationResult<{ id: string; patch: TaskUpdateRequest }> {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskUpdateRequest }) =>
      tasksApi.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await client.cancelQueries({ queryKey: qk.tasks });
      const previous = client.getQueryData<CachedTask[]>(qk.tasks);
      client.setQueryData<CachedTask[]>(qk.tasks, (tasks = []) =>
        tasks.map((task) => (task.id === id ? { ...task, ...patch, syncing: true } : task)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(qk.tasks, context?.previous),
    onSuccess: (updated) => {
      client.setQueryData<CachedTask[]>(qk.tasks, (tasks = []) =>
        tasks.map((task) => (task.id === updated.id ? updated : task)),
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: qk.tasks }),
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

export function useCompleteTask(): MutationResult<string> {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id }: { id: string; completedAt: string }) =>
      tasksApi.update(id, { status: 'done' }),
    onMutate: async ({ id, completedAt }) => {
      await client.cancelQueries({ queryKey: qk.tasks });
      const previous = client.getQueryData<CachedTask[]>(qk.tasks);
      client.setQueryData<CachedTask[]>(qk.tasks, (tasks = []) =>
        tasks.map((task) =>
          task.id === id ? { ...task, status: 'done', completedAt, syncing: true } : task,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(qk.tasks, context?.previous),
    onSuccess: (updated) => {
      client.setQueryData<CachedTask[]>(qk.tasks, (tasks = []) =>
        tasks.map((task) => (task.id === updated.id ? updated : task)),
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: qk.tasks }),
  });
  const mutate = useCallback(
    (id: string) => mutation.mutate({ id, completedAt: new Date().toISOString() }),
    [mutation.mutate],
  );
  return {
    mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}

export function useDeleteTask(): MutationResult<string> {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: qk.tasks });
      const previous = client.getQueryData<CachedTask[]>(qk.tasks);
      client.setQueryData<CachedTask[]>(qk.tasks, (tasks = []) =>
        tasks.filter((task) => task.id !== id),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => client.setQueryData(qk.tasks, context?.previous),
    onSettled: () => client.invalidateQueries({ queryKey: qk.tasks }),
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
