import type {
  ApiErrorBody,
  CurrentSessionResponse,
  SessionCommand,
  SessionResponse,
  SessionStartRequest,
  Task,
  TaskCreateRequest,
  TaskStatus,
  TaskUpdateRequest,
} from '@ekagra/core';
import type { TokenProvider } from '../auth/session';
import type { CliConfig } from '../config';

/** Typed error carrying the contract's error code, thrown for any non-2xx response. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Today's earned-block / honest-minute tally, read from the sessions table. */
export type TodayStats = {
  earnedBlocks: number;
  honestMinutes: number;
};

/** A rolling completion-rate window, read from the `rolling_rates` DB view. */
export type RollingRate = {
  windowDays: number;
  endedSessions: number;
  completedSessions: number;
  honestMinutes: number;
  earnedBlocks: number;
  completionRate: number;
};

/** One person's weekly standing, read from the `weekly_leaderboard` DB view. */
export type WeeklyStanding = {
  userId: string;
  displayName: string | null;
  weekStart: string;
  earnedBlocks: number;
  honestMinutes: number;
};

/**
 * The dependency-injected surface every command depends on. Tests supply a fake
 * implementation; the HTTP client below is the production one. Keeping this a
 * narrow interface (not the raw fetch layer) is what makes the commands testable
 * without standing up Supabase.
 */
export type ApiClient = {
  listTasks(status?: TaskStatus): Promise<Task[]>;
  createTask(input: TaskCreateRequest): Promise<Task>;
  updateTask(id: string, input: TaskUpdateRequest): Promise<Task>;
  commitMorning(taskIds: [string, ...string[]]): Promise<void>;
  currentSession(): Promise<CurrentSessionResponse>;
  startSession(input: SessionStartRequest): Promise<SessionResponse>;
  sessionCommand(command: SessionCommand): Promise<SessionResponse>;
  todayStats(): Promise<TodayStats>;
  rollingRate(windowDays: number): Promise<RollingRate | null>;
  weeklyStandings(): Promise<WeeklyStanding[]>;
  /** The signed-in user's id, decoded from the JWT — used to filter shared views. */
  userId(): Promise<string>;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | undefined>;
  body?: unknown;
  /** Extra headers, e.g. PostgREST `Prefer` / `Range` for REST view reads. */
  headers?: Record<string, string>;
};

function decodeJwtSub(token: string): string {
  const [, payload] = token.split('.');
  if (!payload) return '';
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as { sub?: string };
    return json.sub ?? '';
  } catch {
    return '';
  }
}

/** Builds the production HTTP client. `fetchImpl` is injectable for isolated tests. */
export function createHttpClient(
  config: CliConfig,
  getToken: TokenProvider,
  fetchImpl: typeof fetch = fetch,
): ApiClient {
  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken();
    return { apikey: config.anonKey, Authorization: `Bearer ${token}` };
  }

  async function request<T>(base: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const { method = 'GET', query, body, headers: extra } = opts;
    const url = new URL(`${base}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, value);
      }
    }
    const headers = { ...(await authHeaders()), ...extra };
    if (body !== undefined) headers['content-type'] = 'application/json';

    const response = await fetchImpl(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const errorBody = parsed as ApiErrorBody | null;
      const code = errorBody?.error?.code ?? 'internal_error';
      const message = errorBody?.error?.message ?? `Request failed with status ${response.status}.`;
      throw new ApiError(response.status, code, message);
    }
    return parsed as T;
  }

  const fn = (path: string, opts?: RequestOptions) =>
    request(`${config.supabaseUrl}/functions/v1`, path, opts);
  const rest = <T>(path: string, opts?: RequestOptions) =>
    request<T>(`${config.supabaseUrl}/rest/v1`, path, opts);

  function todayStartIso(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }

  return {
    listTasks: (status) =>
      fn('/tasks', { query: { status } }).then((r) => (r as { tasks: Task[] }).tasks),
    createTask: (input) =>
      fn('/tasks', { method: 'POST', body: input }).then((r) => (r as { task: Task }).task),
    updateTask: (id, input) =>
      fn('/tasks', { method: 'PATCH', query: { id }, body: input }).then(
        (r) => (r as { task: Task }).task,
      ),
    commitMorning: (taskIds) =>
      fn('/rituals', {
        method: 'POST',
        query: { ritual: 'morning-commit' },
        body: { taskIds },
      }).then(() => undefined),
    currentSession: () => fn('/sessions') as Promise<CurrentSessionResponse>,
    startSession: (input) =>
      fn('/sessions', { method: 'POST', body: input }) as Promise<SessionResponse>,
    sessionCommand: (command) =>
      fn('/sessions', { method: 'PATCH', body: command }) as Promise<SessionResponse>,
    userId: async () => decodeJwtSub(await getToken()),

    todayStats: async () => {
      const rows = await rest<Array<{ earned_block: boolean; honest_minutes: number }>>(
        '/sessions',
        {
          query: {
            select: 'earned_block,honest_minutes',
            started_at: `gte.${todayStartIso()}`,
            outcome: 'not.is.null',
          },
        },
      );
      return rows.reduce<TodayStats>(
        (acc, row) => ({
          earnedBlocks: acc.earnedBlocks + (row.earned_block ? 1 : 0),
          honestMinutes: acc.honestMinutes + (row.honest_minutes ?? 0),
        }),
        { earnedBlocks: 0, honestMinutes: 0 },
      );
    },

    rollingRate: async (windowDays) => {
      const rows = await rest<
        Array<{
          window_days: number;
          ended_sessions: number;
          completed_sessions: number;
          honest_minutes: number;
          earned_blocks: number;
          completion_rate: number;
        }>
      >('/rolling_rates', { query: { window_days: `eq.${windowDays}` } });
      const row = rows[0];
      if (!row) return null;
      return {
        windowDays: row.window_days,
        endedSessions: row.ended_sessions,
        completedSessions: row.completed_sessions,
        honestMinutes: row.honest_minutes,
        earnedBlocks: row.earned_blocks,
        completionRate: Number(row.completion_rate),
      };
    },

    weeklyStandings: async () => {
      const rows = await rest<
        Array<{
          user_id: string;
          display_name: string | null;
          week_start: string;
          earned_blocks: number;
          honest_minutes: number;
        }>
      >('/weekly_leaderboard', {
        query: { order: 'earned_blocks.desc', week_start: `eq.${currentWeekStart()}` },
      });
      return rows.map((row) => ({
        userId: row.user_id,
        displayName: row.display_name,
        weekStart: row.week_start,
        earnedBlocks: row.earned_blocks,
        honestMinutes: row.honest_minutes,
      }));
    },
  };
}

/** ISO date (UTC) of Monday this week, matching the view's `date_trunc('week', ...)`. */
export function currentWeekStart(reference: Date = new Date()): string {
  const utc = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  const isoDay = utc.getUTCDay() === 0 ? 7 : utc.getUTCDay();
  utc.setUTCDate(utc.getUTCDate() - (isoDay - 1));
  return utc.toISOString().slice(0, 10);
}
