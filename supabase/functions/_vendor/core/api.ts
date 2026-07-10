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

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  goalId: string | null;
  estimatedBlocks: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Goal = {
  id: string;
  title: string;
  identityRole: string;
  deadline: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
};

export type SessionCommandRequest = {
  action: 'pause' | 'resume' | 'complete';
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
};

export type TaskUpdateRequest = Partial<TaskCreateRequest> & {
  status?: TaskStatus;
};

export type GoalCreateRequest = {
  title: string;
  identityRole: string;
  deadline?: string | null;
};

export type GoalUpdateRequest = Partial<GoalCreateRequest>;

export type MorningCommitRequest = {
  taskIds: [string, ...string[]];
};

export type EveningCloseRequest = {
  planMatch: boolean;
  wentWrongTag: string;
  note?: string | null;
};

export type ForgivenessApplyRequest = {
  reason?: string | null;
};

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
  return { taskId: uuidValue(input.taskId, 'taskId'), durations: timerConfig(input.durations) };
}

export function parseSessionCommand(value: unknown): SessionCommand {
  const input = objectValue(value, 'request');
  if (input.action === 'abandon') {
    const tag = input.distractionTag;
    if (!['distraction', 'interruption', 'done-early', 'energy'].includes(String(tag))) {
      throw new ContractError('distractionTag must be one supported value.');
    }
    return { action: 'abandon', distractionTag: tag as DistractionTag };
  }
  if (input.action !== 'pause' && input.action !== 'resume' && input.action !== 'complete') {
    throw new ContractError('action must be pause, resume, complete, or abandon.');
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
  return value;
}

export function parseGoalCreateRequest(value: unknown): GoalCreateRequest {
  const input = objectValue(value, 'request');
  return {
    title: stringValue(input.title, 'title', 500),
    identityRole: stringValue(input.identityRole, 'identityRole', 120),
    deadline: parseDate(input.deadline, 'deadline'),
  };
}

export function parseGoalUpdateRequest(value: unknown): GoalUpdateRequest {
  const input = objectValue(value, 'request');
  const result: GoalUpdateRequest = {};
  if (input.title !== undefined) result.title = stringValue(input.title, 'title', 500);
  if (input.identityRole !== undefined) {
    result.identityRole = stringValue(input.identityRole, 'identityRole', 120);
  }
  if (input.deadline !== undefined) result.deadline = parseDate(input.deadline, 'deadline');
  if (Object.keys(result).length === 0)
    throw new ContractError('At least one goal field is required.');
  return result;
}

export function parseMorningCommitRequest(value: unknown): MorningCommitRequest {
  const input = objectValue(value, 'request');
  if (!Array.isArray(input.taskIds) || input.taskIds.length < 1 || input.taskIds.length > 3) {
    throw new ContractError('taskIds must contain between 1 and 3 tasks.');
  }
  const taskIds = input.taskIds.map((id) => uuidValue(id, 'taskIds'));
  if (new Set(taskIds).size !== taskIds.length) throw new ContractError('taskIds must be unique.');
  return { taskIds: taskIds as [string, ...string[]] };
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
  const note =
    input.note === null || input.note === undefined ? null : String(input.note).slice(0, 1000);
  const wentWrongTag =
    input.went_wrong_tag === null || input.went_wrong_tag === undefined
      ? null
      : String(input.went_wrong_tag).slice(0, 80);
  return {
    recordDate,
    morningTaskIds,
    planMatch: (input.plan_match as boolean | null | undefined) ?? null,
    wentWrongTag,
    note,
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
