import { describe, expect, it } from 'bun:test';
import { ApiError, createHttpClient, currentWeekStart } from './client';

const config = { supabaseUrl: 'https://example.supabase.co', anonKey: 'anon-key' };
const token = async () => 'jwt-token';

function fetchStub(
  handler: (url: string, init?: RequestInit) => { status: number; body?: unknown },
): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) => {
    const { status, body } = handler(String(url), init);
    return Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), { status }),
    );
  }) as typeof fetch;
}

describe('createHttpClient', () => {
  it('sends apikey + bearer auth and parses edge-function payloads', async () => {
    const seen: Array<{ url: string; headers: Record<string, string> }> = [];
    const client = createHttpClient(
      config,
      token,
      fetchStub((url, init) => {
        seen.push({ url, headers: init?.headers as Record<string, string> });
        return { status: 200, body: { tasks: [] } };
      }),
    );
    await client.listTasks('inbox');
    expect(seen[0]?.url).toBe('https://example.supabase.co/functions/v1/tasks?status=inbox');
    expect(seen[0]?.headers.apikey).toBe('anon-key');
    expect(seen[0]?.headers.Authorization).toBe('Bearer jwt-token');
  });

  it('fetches Today through the authenticated plans edge', async () => {
    const client = createHttpClient(
      config,
      token,
      fetchStub((url) => {
        expect(url).toBe('https://example.supabase.co/functions/v1/plans');
        return {
          status: 200,
          body: {
            plan: {
              id: '30000000-0000-0000-0000-000000000001',
              horizon: 'day',
              startsOn: '2026-08-01',
              parentPlanId: '30000000-0000-0000-0000-000000000002',
            },
            commitments: [],
          },
        };
      }),
    );
    expect((await client.todayPlan()).plan.startsOn).toBe('2026-08-01');
  });

  it('turns contract error bodies into typed ApiErrors', async () => {
    const client = createHttpClient(
      config,
      token,
      fetchStub(() => ({
        status: 409,
        body: { error: { code: 'conflict', message: 'Only a planned task can start.' } },
      })),
    );
    const error = await client.startSession({ taskId: 'x' }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('conflict');
    expect(error.status).toBe(409);
    expect(error.message).toContain('planned task');
  });

  it('sums today stats from the sessions REST read', async () => {
    const client = createHttpClient(
      config,
      token,
      fetchStub((url) => {
        expect(url).toContain('/rest/v1/sessions');
        expect(url).toContain('outcome=not.is.null');
        return {
          status: 200,
          body: [
            { earned_block: true, honest_minutes: 25 },
            { earned_block: false, honest_minutes: 10 },
          ],
        };
      }),
    );
    expect(await client.todayStats()).toEqual({ earnedBlocks: 1, honestMinutes: 35 });
  });

  it('reads the rolling_rates view for the requested window', async () => {
    const client = createHttpClient(
      config,
      token,
      fetchStub((url) => {
        expect(url).toContain('/rest/v1/rolling_rates?window_days=eq.7');
        return {
          status: 200,
          body: [
            {
              window_days: 7,
              ended_sessions: 4,
              completed_sessions: 3,
              honest_minutes: 90,
              earned_blocks: 3,
              completion_rate: '0.75',
            },
          ],
        };
      }),
    );
    const rate = await client.rollingRate(7);
    expect(rate?.completionRate).toBe(0.75);
    expect(rate?.earnedBlocks).toBe(3);
  });
});

describe('currentWeekStart', () => {
  it('returns Monday of the reference week in UTC', () => {
    expect(currentWeekStart(new Date('2026-07-10T12:00:00Z'))).toBe('2026-07-06'); // Friday
    expect(currentWeekStart(new Date('2026-07-06T00:00:00Z'))).toBe('2026-07-06'); // Monday
    expect(currentWeekStart(new Date('2026-07-12T23:59:59Z'))).toBe('2026-07-06'); // Sunday
  });
});
