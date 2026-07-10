import type {
  ApiErrorBody,
  CurrentSessionResponse,
  DailyActivity,
  DayRecord,
  DeviceRegistrationResponse,
  DistractionBreakdown,
  EveningCloseRequest,
  Friend,
  FriendActionRequest,
  FriendInviteRequest,
  Goal,
  GoalCreateRequest,
  IdentityRoleHours,
  MorningCommitRequest,
  MotivationStatus,
  RitualCorrelation,
  Session,
  SessionCommand,
  SessionResponse,
  SessionStartRequest,
  Task,
  TaskCreateRequest,
  TaskStatus,
  TaskUpdateRequest,
  WeeklyReview,
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

// --- Insights ---------------------------------------------------------------

function utcMonday(date = new Date()): string {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

function previousWeek(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
}

export const insightsApi = {
  weekStart: utcMonday,
  previousWeek,
  todayActivity: async (): Promise<DailyActivity> => {
    const { data, error } = await supabase
      .from('daily_activity')
      .select('user_id,activity_date,earned_blocks,honest_minutes')
      .single();
    if (error) throw new ApiError(500, 'internal_error', error.message);
    return {
      userId: String(data.user_id),
      activityDate: String(data.activity_date),
      earnedBlocks: Number(data.earned_blocks),
      honestMinutes: Number(data.honest_minutes),
    };
  },
  weeklyReview: async (weekStart = utcMonday()): Promise<WeeklyReview[]> => {
    const { data, error } = await supabase
      .from('weekly_review')
      .select(
        'user_id,week_start,closed_days,met_days,earned_blocks,honest_minutes,completed_sessions,abandoned_sessions,top_distraction_tag,estimated_blocks,actual_blocks',
      )
      .in('week_start', [weekStart, previousWeek(weekStart)]);
    if (error) throw new ApiError(500, 'internal_error', error.message);
    return (data ?? []).map((row) => ({
      userId: String(row.user_id),
      weekStart: String(row.week_start),
      closedDays: Number(row.closed_days),
      metDays: Number(row.met_days),
      earnedBlocks: Number(row.earned_blocks),
      honestMinutes: Number(row.honest_minutes),
      completedSessions: Number(row.completed_sessions),
      abandonedSessions: Number(row.abandoned_sessions),
      topDistractionTag: row.top_distraction_tag,
      estimatedBlocks: Number(row.estimated_blocks),
      actualBlocks: Number(row.actual_blocks),
    }));
  },
  identityRoleHours: async (weekStart = utcMonday()): Promise<IdentityRoleHours[]> => {
    const { data, error } = await supabase
      .from('identity_role_hours')
      .select('user_id,identity_role,week_start,honest_minutes,earned_blocks')
      .eq('week_start', weekStart);
    if (error) throw new ApiError(500, 'internal_error', error.message);
    return (data ?? []).map((row) => ({
      userId: String(row.user_id),
      identityRole: String(row.identity_role),
      weekStart: String(row.week_start),
      honestMinutes: Number(row.honest_minutes),
      earnedBlocks: Number(row.earned_blocks),
    }));
  },
  distractionBreakdown: async (weekStart = utcMonday()): Promise<DistractionBreakdown[]> => {
    const { data, error } = await supabase
      .from('distraction_breakdown')
      .select('user_id,week_start,distraction_tag,abandoned_sessions,honest_minutes_lost')
      .eq('week_start', weekStart)
      .order('honest_minutes_lost', { ascending: false });
    if (error) throw new ApiError(500, 'internal_error', error.message);
    return (data ?? []).map((row) => ({
      userId: String(row.user_id),
      weekStart: String(row.week_start),
      distractionTag: row.distraction_tag,
      abandonedSessions: Number(row.abandoned_sessions),
      honestMinutesLost: Number(row.honest_minutes_lost),
    }));
  },
  focusHoursHeatmap: async (): Promise<
    Array<{
      dayOfWeek: number;
      hourOfDay: number;
      sessionCount: number;
      honestMinutes: number;
      earnedBlocks: number;
    }>
  > => {
    const { data, error } = await supabase
      .from('focus_hours_heatmap')
      .select('day_of_week,hour_of_day,session_count,honest_minutes,earned_blocks');
    if (error) throw new ApiError(500, 'internal_error', error.message);
    return (data ?? []).map((row) => ({
      dayOfWeek: Number(row.day_of_week),
      hourOfDay: Number(row.hour_of_day),
      sessionCount: Number(row.session_count),
      honestMinutes: Number(row.honest_minutes),
      earnedBlocks: Number(row.earned_blocks),
    }));
  },
  ritualCorrelations: async (): Promise<RitualCorrelation[]> => {
    const { data, error } = await supabase
      .from('ritual_correlations')
      .select('user_id,signal,days_with,days_without,avg_blocks_with,avg_blocks_without,lift');
    if (error) throw new ApiError(500, 'internal_error', error.message);
    return (data ?? []).map((row) => ({
      userId: String(row.user_id),
      signal: row.signal,
      daysWith: Number(row.days_with),
      daysWithout: Number(row.days_without),
      avgBlocksWith: Number(row.avg_blocks_with),
      avgBlocksWithout: Number(row.avg_blocks_without),
      lift: Number(row.lift),
    }));
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
