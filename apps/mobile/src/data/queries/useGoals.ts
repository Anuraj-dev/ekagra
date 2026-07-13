import { useQuery } from '@tanstack/react-query';
import { goalsApi } from '../../lib/api';
import { qk } from '../keys';

export function useGoals() {
  const query = useQuery({ queryKey: qk.goals, queryFn: () => goalsApi.list() });
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
