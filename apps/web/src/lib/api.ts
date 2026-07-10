import type {
  ApiErrorBody,
  CurrentSessionResponse,
  DayRecord,
  DeviceRegistrationResponse,
  EveningCloseRequest,
  Friend,
  FriendActionRequest,
  FriendInviteRequest,
  Goal,
  GoalCreateRequest,
  MorningCommitRequest,
  MotivationStatus,
  Session,
  SessionCommand,
  SessionResponse,
  SessionStartRequest,
  Task,
  TaskCreateRequest,
  TaskStatus,
  TaskUpdateRequest,
} from '@ekagra/core';
import { parseDayRecord } from '@ekagra/core';
import { FUNCTIONS_BASE, supabase } from './supabase';

const DAY_RECORD_COLUMNS = 'record_date,morning_task_ids,plan_match,went_wrong_tag,note,updated_at';

/** A typed error carrying the contract's error code, thrown for any non-2xx response. */
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

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? anonKey;
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
  };
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | undefined>;
  body?: unknown;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body } = opts;
  const url = new URL(`${FUNCTIONS_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const headers = await authHeaders();
  if (body !== undefined) headers['content-type'] = 'application/json';

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const errorBody = parsed as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorBody?.error?.code ?? 'internal_error',
      errorBody?.error?.message ?? `Request failed with status ${response.status}.`,
    );
  }

  return parsed as T;
}

// --- Sessions ---------------------------------------------------------------

export const sessionsApi = {
  current: () => request<CurrentSessionResponse>('/sessions'),
  start: (payload: SessionStartRequest) =>
    request<SessionResponse>('/sessions', { method: 'POST', body: payload }),
  command: (payload: SessionCommand) =>
    request<SessionResponse>('/sessions', { method: 'PATCH', body: payload }),
};

// --- Tasks ------------------------------------------------------------------

export const tasksApi = {
  list: (status?: TaskStatus) =>
    request<{ tasks: Task[] }>('/tasks', { query: { status } }).then((r) => r.tasks),
  create: (payload: TaskCreateRequest) =>
    request<{ task: Task }>('/tasks', { method: 'POST', body: payload }).then((r) => r.task),
  update: (id: string, payload: TaskUpdateRequest) =>
    request<{ task: Task }>('/tasks', { method: 'PATCH', query: { id }, body: payload }).then(
      (r) => r.task,
    ),
  remove: (id: string) => request<void>('/tasks', { method: 'DELETE', query: { id } }),
};

// --- Goals ------------------------------------------------------------------

export const goalsApi = {
  list: () => request<{ goals: Goal[] }>('/goals').then((r) => r.goals),
  create: (payload: GoalCreateRequest) =>
    request<{ goal: Goal }>('/goals', { method: 'POST', body: payload }).then((r) => r.goal),
};

// --- Rituals ----------------------------------------------------------------

export const ritualsApi = {
  morningCommit: (payload: MorningCommitRequest) =>
    request<{ ritual: 'morning-commit'; dayRecord: unknown }>('/rituals', {
      method: 'POST',
      query: { ritual: 'morning-commit' },
      body: payload,
    }),
  eveningClose: (payload: EveningCloseRequest) =>
    request<{ ritual: 'evening-close'; dayRecord: unknown }>('/rituals', {
      method: 'POST',
      query: { ritual: 'evening-close' },
      body: payload,
    }),
};

// --- Day records ------------------------------------------------------------

export const dayRecordsApi = {
  /**
   * Recent plan-vs-actual rows, newest first. Read directly from `day_records`
   * (owner-scoped RLS; writes still go through the rituals edge function).
   */
  recent: async (limit = 14): Promise<DayRecord[]> => {
    const { data, error } = await supabase
      .from('day_records')
      .select(DAY_RECORD_COLUMNS)
      .order('record_date', { ascending: false })
      .limit(limit);
    if (error) throw new ApiError(500, 'internal_error', error.message);
    return (data ?? []).map(parseDayRecord);
  },
};

// --- Forgiveness ------------------------------------------------------------

export const forgivenessApi = {
  apply: (reason?: string | null) =>
    request<{ applied: true; weekStart: string; usedAt: string }>('/forgiveness', {
      method: 'POST',
      body: { reason: reason ?? null },
    }),
};

// --- Motivation + Crew -----------------------------------------------------

export type WeeklyLeaderboardRow = {
  userId: string;
  displayName: string | null;
  weekStart: string;
  earnedBlocks: number;
};

export const motivationApi = {
  status: () => request<MotivationStatus>('/motivation'),
};

export const friendsApi = {
  list: () => request<{ friends: Friend[] }>('/friends').then((r) => r.friends),
  invite: (payload: FriendInviteRequest) =>
    request<{ friendship: Friend }>('/friends', {
      method: 'POST',
      query: { action: 'invite' },
      body: payload,
    }).then((r) => r.friendship),
  accept: (friendshipId: string) =>
    request<{ friendship: Friend }>('/friends', {
      method: 'POST',
      query: { action: 'accept' },
      body: { action: 'accept', friendshipId } satisfies FriendActionRequest,
    }).then((r) => r.friendship),
  remove: (friendshipId: string) =>
    request<{ removed: true }>('/friends', {
      method: 'POST',
      query: { action: 'remove' },
      body: { action: 'remove', friendshipId } satisfies FriendActionRequest,
    }),
};

export const leaderboardApi = {
  weekly: async (): Promise<WeeklyLeaderboardRow[]> => {
    const { data, error } = await supabase
      .from('weekly_leaderboard')
      .select('user_id,display_name,week_start,earned_blocks')
      .order('earned_blocks', { ascending: false });
    if (error) throw new ApiError(500, 'internal_error', error.message);
    return (data ?? []).map((row) => ({
      userId: String(row.user_id),
      displayName: row.display_name,
      weekStart: String(row.week_start),
      earnedBlocks: Number(row.earned_blocks),
    }));
  },
};

// --- Devices ----------------------------------------------------------------

export type DeviceSummary = {
  id: string;
  label: string;
  revoked_at: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export const devicesApi = {
  list: () => request<{ devices: DeviceSummary[] }>('/devices').then((r) => r.devices),
  register: (label?: string) =>
    request<DeviceRegistrationResponse>('/devices', {
      method: 'POST',
      body: { label },
    }),
  revoke: (id: string) => request<void>('/devices', { method: 'DELETE', query: { id } }),
};

export type { Session };
