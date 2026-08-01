import { body, json, method } from '../_shared/http.ts';
import { adminClient, databaseApiError, handle, requireUser } from '../_shared/supabase.ts';
import type { TaskRow } from '../_shared/types.ts';
import {
  type Commitment,
  parseTodayCommitRequest,
  type Task,
  type TodayPlan,
} from '../_vendor/core/index.ts';

const taskFields =
  'id,title,status,goal_id,estimated_blocks,priority,scheduled_for,scheduled_time,deadline,notes,completed_at,created_at,updated_at';

type PlanRow = {
  id: string;
  horizon: 'day';
  starts_on: string;
  parent_plan_id: string;
};

type CommitmentRow = {
  id: string;
  subject_type: Commitment['subjectType'];
  subject_id: string;
  created_at: string;
};

function taskView(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    goalId: row.goal_id,
    estimatedBlocks: row.estimated_blocks,
    priority: row.priority,
    scheduledFor: row.scheduled_for,
    scheduledTime: row.scheduled_time ? row.scheduled_time.slice(0, 5) : row.scheduled_time,
    deadline: row.deadline,
    notes: row.notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureToday(ownerId: string): Promise<string> {
  const ensured = await adminClient().rpc('ensure_today_plan', {
    p_owner_id: ownerId,
  });
  if (ensured.error) throw databaseApiError(ensured.error, 'Could not ensure Today.');
  return ensured.data as string;
}

async function loadToday(
  client: Awaited<ReturnType<typeof requireUser>>['client'],
  ownerId: string,
  planId: string,
): Promise<TodayPlan> {
  const planResult = await client
    .from('plans')
    .select('id,horizon,starts_on,parent_plan_id')
    .eq('owner_id', ownerId)
    .eq('id', planId)
    .single();
  if (planResult.error) throw databaseApiError(planResult.error, 'Could not load Today.');
  const plan = planResult.data as PlanRow;

  const commitmentResult = await client
    .from('commitments')
    .select('id,subject_type,subject_id,created_at')
    .eq('owner_id', ownerId)
    .eq('plan_id', planId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (commitmentResult.error) {
    throw databaseApiError(commitmentResult.error, 'Could not load Today commitments.');
  }
  const rows = commitmentResult.data as CommitmentRow[];
  const taskIds = rows.filter((row) => row.subject_type === 'task').map((row) => row.subject_id);
  const tasksById = new Map<string, Task>();
  if (taskIds.length > 0) {
    const taskResult = await client
      .from('tasks')
      .select(taskFields)
      .eq('owner_id', ownerId)
      .in('id', taskIds);
    if (taskResult.error) {
      throw databaseApiError(taskResult.error, 'Could not load committed tasks.');
    }
    for (const task of taskResult.data as TaskRow[]) {
      tasksById.set(task.id, taskView(task));
    }
  }

  return {
    plan: {
      id: plan.id,
      horizon: plan.horizon,
      startsOn: plan.starts_on,
      parentPlanId: plan.parent_plan_id,
    },
    commitments: rows.map((row) => ({
      id: row.id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      createdAt: row.created_at,
      task: row.subject_type === 'task' ? (tasksById.get(row.subject_id) ?? null) : null,
    })),
  };
}

Deno.serve((request) =>
  handle(request, async () => {
    const { client, ownerId } = await requireUser(request);
    if (request.method === 'GET') {
      const planId = await ensureToday(ownerId);
      return json(await loadToday(client, ownerId, planId));
    }

    method(request, ['POST']);
    const input = parseTodayCommitRequest(await body(request));
    const result = await adminClient().rpc('commit_today_tasks', {
      p_owner_id: ownerId,
      p_task_ids: input.taskIds,
    });
    if (result.error) {
      throw databaseApiError(result.error, 'Could not commit tasks to Today.');
    }
    return json(await loadToday(client, ownerId, result.data as string), 201);
  }),
);
