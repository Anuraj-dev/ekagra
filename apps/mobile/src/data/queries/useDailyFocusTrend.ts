import { useQuery } from '@tanstack/react-query';
import { focusApi } from '../../lib/api';
import { qk } from '../keys';

export function useDailyFocusTrend() {
  const query = useQuery({
    queryKey: qk.dailyFocusTrend,
    queryFn: () => focusApi.dailyFocusTrend(),
    staleTime: 60_000,
  });
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
