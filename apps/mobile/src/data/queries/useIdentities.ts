import { useQuery } from '@tanstack/react-query';
import { identitiesApi } from '../../lib/api';
import { qk } from '../keys';

export function useIdentities() {
  const query = useQuery({ queryKey: qk.identities, queryFn: () => identitiesApi.list() });
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
