import { useQuery } from '@tanstack/react-query';
import { focusApi } from '../../lib/api';
import { qk } from '../keys';

export function useGoalDailyFocus() {
  const query = useQuery({
    queryKey: qk.goalDailyFocus,
    queryFn: () => focusApi.goalDailyFocus(),
    staleTime: 60_000,
  });
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
