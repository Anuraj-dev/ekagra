import { useQuery } from '@tanstack/react-query';
import { plansApi } from '../../lib/api';
import { qk } from '../keys';

export function useTodayPlan() {
  const query = useQuery({ queryKey: qk.todayPlan, queryFn: () => plansApi.today() });
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
