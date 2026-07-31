import type { DistractionTag, TimerConfig, TimerPhase } from './index.ts';

export const API_VERSION = 'v1';

export const API_ENDPOINTS = {
  sessions: '/functions/v1/sessions',
  tasks: '/functions/v1/tasks',
  goals: '/functions/v1/goals',
  rituals: '/functions/v1/rituals',
  forgiveness: '/functions/v1/forgiveness',
  devices: '/functions/v1/devices',
  devicePoll: '/functions/v1/device-poll',
  deviceAction: '/functions/v1/device-action',
  friends: '/functions/v1/friends',
  motivation: '/functions/v1/motivation',
} as const;

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'internal_error';

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
};

export class ContractError extends Error {
  readonly code: Extract<ApiErrorCode, 'bad_request'> = 'bad_request';

  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
  }
}

export type TaskStatus = 'inbox' | 'planned' | 'done' | 'cancelled';

export type Priority = 'p1' | 'p2' | 'p3';

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  goalId: string | null;
  estimatedBlocks: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // v2 planning fields — optional during the rebuild: the migration adds the columns
  // and edge fns/hooks populate them; a Task fetched before the mapper update lacks them.
  priority?: Priority | null;
  scheduledFor?: string | null;
  scheduledTime?: string | null;
  deadline?: string | null;
  notes?: string | null;
};

/**
 * An owner-scoped identity ("Builder", "Student"). Every owner has the default
 * `Me` identity, which keeps capture one tap.
 */
export type Identity = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Goal = {
  id: string;
  title: string;
  /** Compatibility mirror of the identity name, maintained by the database. */
  identityRole: string;
  deadline: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  priority?: Priority | null; // v2 — optional during rebuild (see Task)
  /** Authoritative identity link — optional during the identity migration (see Task). */
  identityId?: string;
};

export type SessionStatus = 'running' | 'paused' | 'completed' | 'abandoned';

export type Session = {
  id: string;
  taskId: string;
  taskTitle?: string;
  plannedMinutes: number;
  startedAt: string;
  pausedAt: string | null;
  endedAt: string | null;
  status: SessionStatus;
  elapsedSeconds: number;
  remainingSeconds: number;
  honestMinutes: number;
  earnedBlock: boolean;
  distractionTag: DistractionTag | null;
};

export type SessionStartRequest = {
  taskId: string;
  durations?: TimerConfig;
  clientOpId?: string;
};

export type SessionCommandRequest = {
  action: 'pause' | 'resume' | 'complete' | 'completeEarly';
};

export type SessionAbandonRequest = {
  action: 'abandon';
  distractionTag: DistractionTag;
};

export type SessionCommand = SessionCommandRequest | SessionAbandonRequest;

export type SessionResponse = {
  session: Session;
  serverNow: string;
};

export type CurrentSessionResponse = {
  session: Session | null;
  serverNow: string;
};

export type TaskCreateRequest = {
  title: string;
  goalId?: string | null;
  estimatedBlocks?: number | null;
  priority?: Priority | null;
  scheduledFor?: string | null;
  scheduledTime?: string | null;
  deadline?: string | null;
  notes?: string | null;
  clientOpId?: string;
};

export type TaskUpdateRequest = Partial<TaskCreateRequest> & {
  status?: TaskStatus;
};

type GoalWriteFields = {
  title: string;
  deadline?: string | null;
  priority?: Priority | null;
  clientOpId?: string;
};

type GoalIdentityChoice =
  | {
      /** Preferred identity seam. */
      identityId: string;
      identityRole?: never;
    }
  | {
      identityId?: never;
      /** Legacy label seam — the database resolves it to an identity of the same owner. */
      identityRole: string;
    };

type OptionalGoalIdentity = GoalIdentityChoice | { identityId?: never; identityRole?: never };

/** Goal creation always carries exactly one identity representation. */
export type GoalCreateRequest = GoalWriteFields & GoalIdentityChoice;

/** Goal updates may omit identity, but cannot send both identity representations. */
export type GoalUpdateRequest = Partial<GoalWriteFields> & OptionalGoalIdentity;

export type MorningCommitRequest = {
  taskIds: string[];
};

export type DailyActivity = {
  userId: string;
  activityDate: string;
  earnedBlocks: number;
  honestMinutes: number;
};

export type EveningCloseRequest = {
  planMatch: boolean;
  wentWrongTag: string;
  note?: string | null;
};

export type ForgivenessApplyRequest = {
  reason?: string | null;
};

export type MotivationRates = {
  windowDays: 7 | 30;
  windowStart: string;
  closedDays: number;
  metDays: number;
  earnedBlocks: number;
  completionRate: number;
};

export type MotivationStatus = {
  rates: MotivationRates[];
  streakDays: number;
  neverMissTwice: boolean;
  daysSilent: number | null;
  welcomeBack: boolean;
};

export type IdentityRoleHours = {
  userId: string;
  identityRole: string;
  weekStart: string;
  honestMinutes: number;
  earnedBlocks: number;
};

export type DistractionBreakdown = {
  userId: string;
  weekStart: string;
  distractionTag: DistractionTag;
  abandonedSessions: number;
  honestMinutesLost: number;
};

export type WeeklyReview = {
  userId: string;
  weekStart: string;
  closedDays: number;
  metDays: number;
  earnedBlocks: number;
  honestMinutes: number;
  completedSessions: number;
  abandonedSessions: number;
  topDistractionTag: DistractionTag | null;
  estimatedBlocks: number;
  actualBlocks: number;
};

export type RitualCorrelation = {
  userId: string;
  signal: 'morning_commit' | 'evening_close';
  daysWith: number;
  daysWithout: number;
  avgBlocksWith: number;
  avgBlocksWithout: number;
  lift: number;
};

export type Friend = {
  id: string;
  userId: string;
  displayName: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  direction: 'incoming' | 'outgoing' | 'friend';
};

export type FriendInviteRequest = { email?: string; userId?: string };
export type FriendActionRequest = { action: 'accept' | 'remove'; friendshipId: string };

/**
 * A persisted day record — the plan-vs-actual row written by the morning-commit
 * and evening-close rituals. Read directly from `day_records` (owner-scoped RLS);
 * `planMatch`/`wentWrongTag` stay null until the day is closed.
 */
export type DayRecord = {
  recordDate: string;
  morningTaskIds: string[];
  planMatch: boolean | null;
  wentWrongTag: string | null;
  note: string | null;
  updatedAt: string;
};

export type AppRelease = {
  id: string;
  platform: string;
  version: string;
  apkUrl: string;
  sha256: string | null;
  notes: string | null;
  createdAt: string;
};

export type DeviceAction = 'start_next_planned' | 'pause';

export type DeviceActionRequest = {
  action: DeviceAction;
};

/** Fixed, compact payload consumed by the ESP8266 16x2 display. */
export type DevicePollPayload = {
  t: string | null;
  c: string;
  p: Extract<TimerPhase, 'idle' | 'work' | 'short_break' | 'long_break'>;
  b: number;
  w: number;
  n: string;
};

export type DeviceRegistrationResponse = {
  deviceId: string;
  deviceToken: string;
};

export type DeviceActionResponse = {
  session: Session | null;
  serverNow: string;
};

export type DeviceRegistrationRequest = {
  label?: string;
};

export type RealtimeChannel = 'sessions:user' | 'tasks:user' | 'day-records:user';

function objectValue(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new ContractError(
      `${field} must be a non-empty string of at most ${maxLength} characters.`,
    );
  }
  return value.trim();
}

function storedStringValue(value: unknown, field: string): string {
  // Stored rows can predate the public write contract. PostgreSQL's historical
  // trim() check removed ordinary spaces only, so a tab-only legacy value was
  // valid and must remain readable after an additive migration.
  if (typeof value !== 'string' || value.length === 0) {
    throw new ContractError(`${field} must be a non-empty string.`);
  }
  return value;
}

/** A string-or-null field: undefined/null map to null, anything non-string is rejected. */
function nullableString(value: unknown, field: string, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ContractError(
      `${field} must be a string of at most ${maxLength} characters or null.`,
    );
  }
  return value;
}

function uuidValue(value: unknown, field: string): string {
  const result = stringValue(value, field, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result)) {
    throw new ContractError(`${field} must be a UUID.`);
  }
  return result;
}

export function parseUuid(value: unknown, field: string): string {
  return uuidValue(value, field);
}

export function parseTaskStatus(value: unknown, field = 'status'): TaskStatus {
  if (!['inbox', 'planned', 'done', 'cancelled'].includes(String(value))) {
    throw new ContractError(`${field} is invalid.`);
  }
  return value as TaskStatus;
}

function optionalUuid(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return uuidValue(value, field);
}

function parsePriority(value: unknown, field: string): Priority | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || !['p1', 'p2', 'p3'].includes(value)) {
    throw new ContractError(`${field} is invalid.`);
  }
  return value as Priority;
}

function parseTimeOfDay(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new ContractError(`${field} must be an HH:MM time or null.`);
  }
  return value;
}

function integerValue(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ContractError(`${field} must be a whole number between ${min} and ${max}.`);
  }
  return value;
}

function timerConfig(value: unknown): TimerConfig | undefined {
  if (value === undefined) return undefined;
  const input = objectValue(value, 'durations');
  const output: TimerConfig = {};
  for (const field of ['workMinutes', 'shortBreakMinutes', 'longBreakMinutes'] as const) {
    if (input[field] !== undefined) output[field] = integerValue(input[field], field, 1, 480);
  }
  if (Object.keys(output).length === 0) throw new ContractError('durations must not be empty.');
  return output;
}

export function parseSessionStartRequest(value: unknown): SessionStartRequest {
  const input = objectValue(value, 'request');
  return {
    taskId: uuidValue(input.taskId, 'taskId'),
    durations: timerConfig(input.durations),
    ...(input.clientOpId === undefined
      ? {}
      : { clientOpId: uuidValue(input.clientOpId, 'clientOpId') }),
  };
}

export function parseSessionCommand(value: unknown): SessionCommand {
  const input = objectValue(value, 'request');
  if (input.action === 'abandon') {
    const tag = input.distractionTag;
    if (!['distraction', 'interruption', 'energy'].includes(String(tag))) {
      throw new ContractError('distractionTag must be one supported value.');
    }
    return { action: 'abandon', distractionTag: tag as DistractionTag };
  }
  if (
    input.action !== 'pause' &&
    input.action !== 'resume' &&
    input.action !== 'complete' &&
    input.action !== 'completeEarly'
  ) {
    throw new ContractError('action must be pause, resume, complete, completeEarly, or abandon.');
  }
  return { action: input.action };
}

export function parseTaskCreateRequest(value: unknown): TaskCreateRequest {
  const input = objectValue(value, 'request');
  const estimatedBlocks = input.estimatedBlocks;
  return {
    title: stringValue(input.title, 'title', 500),
    goalId: optionalUuid(input.goalId, 'goalId'),
    estimatedBlocks:
      estimatedBlocks === undefined || estimatedBlocks === null
        ? estimatedBlocks
        : integerValue(estimatedBlocks, 'estimatedBlocks', 1, 100),
    ...(input.priority === undefined
      ? {}
      : { priority: parsePriority(input.priority, 'priority') }),
    ...(input.scheduledFor === undefined
      ? {}
      : { scheduledFor: parseDate(input.scheduledFor, 'scheduledFor') }),
    ...(input.scheduledTime === undefined
      ? {}
      : { scheduledTime: parseTimeOfDay(input.scheduledTime, 'scheduledTime') }),
    ...(input.deadline === undefined ? {} : { deadline: parseDate(input.deadline, 'deadline') }),
    ...(input.notes === undefined ? {} : { notes: nullableString(input.notes, 'notes', 2000) }),
    ...(input.clientOpId === undefined
      ? {}
      : { clientOpId: uuidValue(input.clientOpId, 'clientOpId') }),
  };
}

export function parseTaskUpdateRequest(value: unknown): TaskUpdateRequest {
  const input = objectValue(value, 'request');
  const result: TaskUpdateRequest = {};
  if (input.title !== undefined) result.title = stringValue(input.title, 'title', 500);
  if (input.goalId !== undefined) result.goalId = optionalUuid(input.goalId, 'goalId');
  if (input.estimatedBlocks !== undefined) {
    result.estimatedBlocks =
      input.estimatedBlocks === null
        ? null
        : integerValue(input.estimatedBlocks, 'estimatedBlocks', 1, 100);
  }
  if (input.status !== undefined) {
    result.status = parseTaskStatus(input.status);
  }
  if (input.priority !== undefined) result.priority = parsePriority(input.priority, 'priority');
  if (input.scheduledFor !== undefined) {
    result.scheduledFor = parseDate(input.scheduledFor, 'scheduledFor');
  }
  if (input.scheduledTime !== undefined) {
    result.scheduledTime = parseTimeOfDay(input.scheduledTime, 'scheduledTime');
  }
  if (input.deadline !== undefined) result.deadline = parseDate(input.deadline, 'deadline');
  if (input.notes !== undefined) result.notes = nullableString(input.notes, 'notes', 2000);
  if (Object.keys(result).length === 0)
    throw new ContractError('At least one task field is required.');
  return result;
}

function parseDate(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ContractError(`${field} must be an ISO date or null.`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    throw new ContractError(`${field} must be a real calendar date.`);
  }
  return value;
}

/**
 * The identity fields of a goal write. `identityId` is authoritative; `identityRole`
 * stays accepted while callers migrate, and the database resolves it to an identity.
 */
function parseGoalIdentity(input: Record<string, unknown>): {
  identityId?: string;
  identityRole?: string;
} {
  if (input.identityId !== undefined && input.identityRole !== undefined) {
    throw new ContractError('Provide identityId or identityRole, not both.');
  }
  if (input.identityId !== undefined) {
    return { identityId: uuidValue(input.identityId, 'identityId') };
  }
  if (input.identityRole !== undefined) {
    return { identityRole: stringValue(input.identityRole, 'identityRole', 120) };
  }
  return {};
}

export function parseGoalCreateRequest(value: unknown): GoalCreateRequest {
  const input = objectValue(value, 'request');
  const identity = parseGoalIdentity(input);
  if (identity.identityId === undefined && identity.identityRole === undefined) {
    throw new ContractError('identityId or identityRole is required.');
  }
  const fields: GoalWriteFields = {
    title: stringValue(input.title, 'title', 500),
    deadline: parseDate(input.deadline, 'deadline'),
    ...(input.priority === undefined
      ? {}
      : { priority: parsePriority(input.priority, 'priority') }),
    ...(input.clientOpId === undefined
      ? {}
      : { clientOpId: uuidValue(input.clientOpId, 'clientOpId') }),
  };
  return identity.identityId !== undefined
    ? { ...fields, identityId: identity.identityId }
    : { ...fields, identityRole: identity.identityRole as string };
}

export function parseGoalUpdateRequest(value: unknown): GoalUpdateRequest {
  const input = objectValue(value, 'request');
  const result: Partial<GoalWriteFields> & { identityId?: string; identityRole?: string } = {
    ...parseGoalIdentity(input),
  };
  if (input.title !== undefined) result.title = stringValue(input.title, 'title', 500);
  if (input.deadline !== undefined) result.deadline = parseDate(input.deadline, 'deadline');
  if (input.priority !== undefined) result.priority = parsePriority(input.priority, 'priority');
  if (Object.keys(result).length === 0)
    throw new ContractError('At least one goal field is required.');
  return result as GoalUpdateRequest;
}

export function parseMorningCommitRequest(value: unknown): MorningCommitRequest {
  const input = objectValue(value, 'request');
  if (!Array.isArray(input.taskIds) || input.taskIds.length > 3) {
    throw new ContractError('taskIds must contain at most 3 tasks.');
  }
  const taskIds = input.taskIds.map((id) => uuidValue(id, 'taskIds'));
  if (new Set(taskIds).size !== taskIds.length) throw new ContractError('taskIds must be unique.');
  return { taskIds };
}

export function parseEveningCloseRequest(value: unknown): EveningCloseRequest {
  const input = objectValue(value, 'request');
  if (typeof input.planMatch !== 'boolean') throw new ContractError('planMatch must be boolean.');
  const wentWrongTag = stringValue(input.wentWrongTag, 'wentWrongTag', 80);
  if (input.note !== undefined && input.note !== null && typeof input.note !== 'string') {
    throw new ContractError('note must be a string or null.');
  }
  if (typeof input.note === 'string' && input.note.length > 1000) {
    throw new ContractError('note must be at most 1000 characters.');
  }
  return {
    planMatch: input.planMatch,
    wentWrongTag,
    note: input.note as string | null | undefined,
  };
}

/**
 * Maps a raw `day_records` row (snake_case, as returned by Supabase/RLS reads)
 * into a typed {@link DayRecord}. Lenient on the ritual fields that are null
 * until the day is closed.
 */
export function parseDayRecord(value: unknown): DayRecord {
  const input = objectValue(value, 'dayRecord');
  const recordDate = stringValue(input.record_date, 'record_date', 40);
  const rawIds = Array.isArray(input.morning_task_ids) ? input.morning_task_ids : [];
  const morningTaskIds = rawIds.map((id) => uuidValue(id, 'morning_task_ids'));
  if (input.plan_match !== null && input.plan_match !== undefined) {
    if (typeof input.plan_match !== 'boolean') {
      throw new ContractError('plan_match must be a boolean or null.');
    }
  }
  const note = nullableString(input.note, 'note', 1000);
  const wentWrongTag = nullableString(input.went_wrong_tag, 'went_wrong_tag', 80);
  return {
    recordDate,
    morningTaskIds,
    planMatch: (input.plan_match as boolean | null | undefined) ?? null,
    wentWrongTag,
    note,
    updatedAt: stringValue(input.updated_at, 'updated_at', 40),
  };
}

/**
 * Maps a raw `identities` row (snake_case, as returned by Supabase/RLS reads)
 * into a typed {@link Identity}.
 */
export function parseIdentity(value: unknown): Identity {
  const input = objectValue(value, 'identity');
  return {
    id: uuidValue(input.id, 'id'),
    name: storedStringValue(input.name, 'name'),
    isDefault: input.is_default === true,
    createdAt: stringValue(input.created_at, 'created_at', 40),
    updatedAt: stringValue(input.updated_at, 'updated_at', 40),
  };
}

export function parseDeviceActionRequest(value: unknown): DeviceActionRequest {
  const input = objectValue(value, 'request');
  if (input.action !== 'start_next_planned' && input.action !== 'pause') {
    throw new ContractError('action must be start_next_planned or pause.');
  }
  return { action: input.action };
}

export function parseForgivenessApplyRequest(value: unknown): ForgivenessApplyRequest {
  const input = objectValue(value, 'request');
  if (input.reason !== undefined && input.reason !== null && typeof input.reason !== 'string') {
    throw new ContractError('reason must be a string or null.');
  }
  if (typeof input.reason === 'string' && input.reason.trim().length > 200) {
    throw new ContractError('reason must be at most 200 characters.');
  }
  return { reason: input.reason as string | null | undefined };
}

export function parseFriendInviteRequest(value: unknown): FriendInviteRequest {
  const input = objectValue(value, 'request');
  const email = input.email;
  const userId = input.userId;
  if (email !== undefined && userId !== undefined) {
    throw new ContractError('Provide email or userId, not both.');
  }
  if (email === undefined && userId === undefined) {
    throw new ContractError('email or userId is required.');
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      throw new ContractError('email must be valid.');
    }
    return { email: email.trim().toLowerCase() };
  }
  return { userId: uuidValue(userId, 'userId') };
}

export function parseFriendActionRequest(value: unknown): FriendActionRequest {
  const input = objectValue(value, 'request');
  if (input.action !== 'accept' && input.action !== 'remove') {
    throw new ContractError('action must be accept or remove.');
  }
  return { action: input.action, friendshipId: uuidValue(input.friendshipId, 'friendshipId') };
}

export function parseDeviceRegistrationRequest(value: unknown): DeviceRegistrationRequest {
  const input = objectValue(value, 'request');
  if (input.label !== undefined && input.label !== null && typeof input.label !== 'string') {
    throw new ContractError('label must be a string or null.');
  }
  if (
    typeof input.label === 'string' &&
    (input.label.trim().length === 0 || input.label.trim().length > 80)
  ) {
    throw new ContractError('label must be between 1 and 80 characters.');
  }
  return { label: typeof input.label === 'string' ? input.label.trim() : undefined };
}
