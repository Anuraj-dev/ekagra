import type {
  DevicePollPayload,
  Goal,
  Session,
  SessionCommand,
  SessionStartRequest,
  Task,
  TimerConfig,
} from '../../../packages/core/src/index.ts';

export type TaskRow = {
  id: string;
  owner_id: string;
  title: string;
  status: Task['status'];
  goal_id: string | null;
  estimated_blocks: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalRow = {
  id: string;
  owner_id: string;
  title: string;
  identity_role: string;
  deadline: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: string;
  owner_id: string;
  task_id: string;
  started_at: string;
  running_since: string | null;
  paused_at: string | null;
  ended_at: string | null;
  planned_minutes: number;
  outcome: 'completed' | 'abandoned' | null;
  distraction_tag: Session['distractionTag'];
  honest_minutes: number;
  earned_block: boolean;
  active_milliseconds: number;
  task?: Pick<TaskRow, 'title'> | null;
};

export type SessionPatch = Partial<
  Pick<
    SessionRow,
    | 'running_since'
    | 'paused_at'
    | 'active_milliseconds'
    | 'ended_at'
    | 'outcome'
    | 'distraction_tag'
    | 'honest_minutes'
  >
>;

export interface SessionRepository {
  getTask(ownerId: string, taskId: string): Promise<TaskRow | null>;
  getActiveSession(ownerId: string): Promise<SessionRow | null>;
  insertSession(input: {
    ownerId: string;
    taskId: string;
    plannedMinutes: number;
    startedAt: string;
  }): Promise<SessionRow>;
  updateSession(ownerId: string, sessionId: string, patch: SessionPatch): Promise<SessionRow>;
  ensureDayRecord(ownerId: string): Promise<void>;
  getTodayBlocks(ownerId: string): Promise<number>;
  getWeeklyMinutes(ownerId: string): Promise<number>;
  getNextPlannedTask(ownerId: string): Promise<TaskRow | null>;
}

export type HandlerContext = {
  ownerId: string;
  now: number;
};

export type StartSessionHandler = (
  context: HandlerContext,
  input: SessionStartRequest,
) => Promise<Session>;

export type SessionCommandHandler = (
  context: HandlerContext,
  command: SessionCommand,
) => Promise<Session>;

export type DevicePollHandler = (context: HandlerContext) => Promise<DevicePollPayload>;

export type ApiRow = TaskRow | GoalRow | SessionRow;

export type TaskInput = {
  title?: string;
  goal_id?: string | null;
  estimated_blocks?: number | null;
  status?: Task['status'];
};

export type GoalInput = {
  title?: string;
  identity_role?: string;
  deadline?: string | null;
};

export type DeviceRecord = {
  id: string;
  owner_id: string;
  label: string;
  token_hash: string;
  revoked_at: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export type { DevicePollPayload, Goal, Session, SessionStartRequest, Task, TimerConfig };
