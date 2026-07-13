import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../../lib/api';
import { qk } from '../keys';

export function useTasks() {
  const query = useQuery({ queryKey: qk.tasks, queryFn: () => tasksApi.list() });
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
