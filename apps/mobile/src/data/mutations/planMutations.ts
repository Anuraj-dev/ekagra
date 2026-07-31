import type { TodayCommitRequest } from '@ekagra/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '../../lib/api';
import { qk } from '../keys';
import type { MutationResult } from './types';

export function useCommitToday(): MutationResult<TodayCommitRequest> {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: TodayCommitRequest) => plansApi.commitToday(input),
    onSuccess: (today) => client.setQueryData(qk.todayPlan, today),
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: qk.todayPlan }),
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
