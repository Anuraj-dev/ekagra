import type {
  EveningCloseRequest,
  Goal,
  Session,
  SessionCommand,
  Task,
  TaskCreateRequest,
  TaskUpdateRequest,
} from '@ekagra/core';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { goalsApi, ritualsApi, sessionsApi, tasksApi } from '../lib/api';

type DataContextValue = {
  goals: Goal[];
  tasks: Task[];
  session: Session | null;
  /** Date.now() + offset ≈ server clock, used to drive the timer honestly. */
  serverClockOffset: number;
  /** Server time (ms) at the last sync — the anchor for reconstructing timer state. */
  sessionAnchorMs: number;
  /**
   * In-memory day tally. No client endpoint exposes per-day/per-task earned-block
   * aggregates (only the device-poll RPC does), so these accumulate from session
   * outcomes observed this app session and reset on reload. See report/risks.
   */
  todayEarnedBlocks: number;
  todayHonestMinutes: number;
  earnedByTask: Record<string, number>;
  recordSessionEnd: (ended: Session) => void;
  loading: boolean;
  error: string | null;
  reloadTasks: () => Promise<void>;
  reloadSession: () => Promise<void>;
  reloadAll: () => Promise<void>;
  createTask: (payload: TaskCreateRequest) => Promise<Task>;
  updateTask: (id: string, payload: TaskUpdateRequest) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  commitMorning: (taskIds: string[]) => Promise<void>;
  startSession: (taskId: string) => Promise<Session>;
  sessionCommand: (command: SessionCommand) => Promise<Session>;
  closeEvening: (payload: EveningCloseRequest) => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const [sessionAnchorMs, setSessionAnchorMs] = useState(() => Date.now());
  const [todayEarnedBlocks, setTodayEarnedBlocks] = useState(0);
  const [todayHonestMinutes, setTodayHonestMinutes] = useState(0);
  const [earnedByTask, setEarnedByTask] = useState<Record<string, number>>({});
  const countedSessions = useRef<Set<string>>(new Set());

  const recordSessionEnd = useCallback((ended: Session) => {
    if (ended.status !== 'completed' && ended.status !== 'abandoned') return;
    if (countedSessions.current.has(ended.id)) return;
    countedSessions.current.add(ended.id);
    setTodayHonestMinutes((m) => m + ended.honestMinutes);
    if (ended.earnedBlock) {
      setTodayEarnedBlocks((b) => b + 1);
      setEarnedByTask((prev) => ({ ...prev, [ended.taskId]: (prev[ended.taskId] ?? 0) + 1 }));
    }
  }, []);

  const applyServerNow = useCallback((serverNow: string) => {
    const serverMs = new Date(serverNow).getTime();
    const offset = serverMs - Date.now();
    offsetRef.current = offset;
    setServerClockOffset(offset);
    setSessionAnchorMs(serverMs);
  }, []);

  const reloadTasks = useCallback(async () => {
    setTasks(await tasksApi.list());
  }, []);

  const reloadSession = useCallback(async () => {
    const res = await sessionsApi.current();
    applyServerNow(res.serverNow);
    setSession(res.session);
  }, [applyServerNow]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalList, taskList, current] = await Promise.all([
        goalsApi.list(),
        tasksApi.list(),
        sessionsApi.current(),
      ]);
      setGoals(goalList);
      setTasks(taskList);
      applyServerNow(current.serverNow);
      setSession(current.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your data.');
    } finally {
      setLoading(false);
    }
  }, [applyServerNow]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const createTask = useCallback(
    async (payload: TaskCreateRequest) => {
      const task = await tasksApi.create(payload);
      await reloadTasks();
      return task;
    },
    [reloadTasks],
  );

  const updateTask = useCallback(
    async (id: string, payload: TaskUpdateRequest) => {
      const task = await tasksApi.update(id, payload);
      await reloadTasks();
      return task;
    },
    [reloadTasks],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await tasksApi.remove(id);
      await reloadTasks();
    },
    [reloadTasks],
  );

  const commitMorning = useCallback(
    async (taskIds: string[]) => {
      await ritualsApi.morningCommit({ taskIds: taskIds as [string, ...string[]] });
      await reloadTasks();
    },
    [reloadTasks],
  );

  const startSession = useCallback(
    async (taskId: string) => {
      const res = await sessionsApi.start({ taskId });
      applyServerNow(res.serverNow);
      setSession(res.session);
      return res.session;
    },
    [applyServerNow],
  );

  const sessionCommand = useCallback(
    async (command: SessionCommand) => {
      const res = await sessionsApi.command(command);
      applyServerNow(res.serverNow);
      setSession(res.session);
      return res.session;
    },
    [applyServerNow],
  );

  const closeEvening = useCallback(async (payload: EveningCloseRequest) => {
    await ritualsApi.eveningClose(payload);
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      goals,
      tasks,
      session,
      serverClockOffset,
      sessionAnchorMs,
      todayEarnedBlocks,
      todayHonestMinutes,
      earnedByTask,
      recordSessionEnd,
      loading,
      error,
      reloadTasks,
      reloadSession,
      reloadAll,
      createTask,
      updateTask,
      deleteTask,
      commitMorning,
      startSession,
      sessionCommand,
      closeEvening,
    }),
    [
      goals,
      tasks,
      session,
      serverClockOffset,
      sessionAnchorMs,
      todayEarnedBlocks,
      todayHonestMinutes,
      earnedByTask,
      recordSessionEnd,
      loading,
      error,
      reloadTasks,
      reloadSession,
      reloadAll,
      createTask,
      updateTask,
      deleteTask,
      commitMorning,
      startSession,
      sessionCommand,
      closeEvening,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
