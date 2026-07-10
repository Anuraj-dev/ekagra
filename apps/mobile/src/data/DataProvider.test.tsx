import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Session } from '@ekagra/core';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

// The provider pulls in lib/supabase, which needs the native storage and
// expo-constants modules; stub them so the pure React logic runs under bun.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  },
}));
mock.module('expo-constants', () => ({ default: { expoConfig: { extra: {} } } }));

const { DataProvider, useData } = await import('./DataProvider');

const runningSession: Session = {
  id: 'sess-1',
  taskId: 'task-1',
  plannedMinutes: 25,
  startedAt: '2026-07-10T09:00:00.000Z',
  pausedAt: null,
  endedAt: null,
  status: 'running',
  elapsedSeconds: 1500,
  remainingSeconds: 0,
  honestMinutes: 25,
  earnedBlock: false,
  distractionTag: null,
};

const completedSession: Session = {
  ...runningSession,
  status: 'completed',
  endedAt: '2026-07-10T09:25:00.000Z',
  earnedBlock: true,
};

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** Fetch stub covering the provider's initial load and the sessions PATCH. */
function stubFetch(patchResult: Session | null) {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const serverNow = '2026-07-10T09:25:00.000Z';
    if (url.includes('/goals')) return Promise.resolve(jsonResponse({ goals: [] }));
    if (url.includes('/tasks')) return Promise.resolve(jsonResponse({ tasks: [] }));
    if (url.includes('/sessions') && method === 'PATCH') {
      return Promise.resolve(jsonResponse({ session: patchResult, serverNow }));
    }
    if (url.includes('/sessions')) {
      return Promise.resolve(jsonResponse({ session: runningSession, serverNow }));
    }
    return Promise.resolve(jsonResponse({}));
  }) as typeof fetch;
}

function Probe() {
  const { session, todayEarnedBlocks, loading, sessionCommand } = useData();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="session">{session ? session.status : 'none'}</span>
      <span data-testid="earned">{todayEarnedBlocks}</span>
      <button type="button" onClick={() => void sessionCommand({ action: 'complete' })}>
        complete
      </button>
      <button type="button" onClick={() => void sessionCommand({ action: 'pause' })}>
        pause
      </button>
    </div>
  );
}

describe('DataProvider sessionCommand (mobile)', () => {
  beforeEach(() => stubFetch(completedSession));
  afterEach(() => {
    globalThis.fetch = originalFetch;
    cleanup();
  });

  it('clears the active session and records the block on a terminal response', async () => {
    render(
      <DataProvider>
        <Probe />
      </DataProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('session').textContent).toBe('running');

    await act(async () => {
      screen.getByText('complete').click();
    });

    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('none'));
    expect(screen.getByTestId('earned').textContent).toBe('1');
  });

  it('keeps a non-terminal session active after pause', async () => {
    stubFetch({ ...runningSession, status: 'paused' });
    render(
      <DataProvider>
        <Probe />
      </DataProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      screen.getByText('pause').click();
    });

    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('paused'));
    expect(screen.getByTestId('earned').textContent).toBe('0');
  });
});
