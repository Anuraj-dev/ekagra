import type { CurrentSessionResponse } from '@ekagra/core';
import { onlineManager, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { sessionsApi } from '../../lib/api';
import { qk } from '../keys';

const emptySession: CurrentSessionResponse = {
  session: null,
  serverNow: new Date().toISOString(),
};

export function useCurrentSessionQuery() {
  const query = useQuery({
    queryKey: qk.session,
    queryFn: () => sessionsApi.current(),
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  });

  useEffect(() => {
    if (!query.isFetched) void query.refetch();

    const appStateSubscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void query.refetch();
    });
    const onlineSubscription = onlineManager.subscribe((online) => {
      if (online) void query.refetch();
    });

    return () => {
      appStateSubscription.remove();
      onlineSubscription();
    };
  }, [query.isFetched, query.refetch]);

  return query;
}

export function useCurrentSession() {
  const query = useCurrentSessionQuery();
  return {
    data: query.data ?? emptySession,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
