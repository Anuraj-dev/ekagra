import {
  parseTaskCreateRequest,
  parseTaskUpdateRequest,
  type Task,
} from '../../../packages/core/src/index.ts';
import { ApiError, body, json, method } from '../_shared/http.ts';
import { handle, requireUser } from '../_shared/supabase.ts';
import type { TaskRow } from '../_shared/types.ts';

const fields = 'id,title,status,goal_id,estimated_blocks,completed_at,created_at,updated_at';

function view(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    goalId: row.goal_id,
    estimatedBlocks: row.estimated_blocks,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireId(request: Request): Promise<string> {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new ApiError('bad_request', 'id query parameter is required.');
  return id;
}

Deno.serve((request) =>
  handle(request, async () => {
    const { client, ownerId } = await requireUser(request);
    if (request.method === 'GET') {
      const status = new URL(request.url).searchParams.get('status');
      let query = client
        .from('tasks')
        .select(fields)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const result = await query;
      if (result.error) throw new ApiError('internal_error', 'Could not load tasks.');
      return json({ tasks: (result.data as TaskRow[]).map(view) });
    }
    if (request.method === 'POST') {
      const input = parseTaskCreateRequest(await body(request));
      const result = await client
        .from('tasks')
        .insert({
          owner_id: ownerId,
          title: input.title,
          goal_id: input.goalId ?? null,
          estimated_blocks: input.estimatedBlocks ?? null,
        })
        .select(fields)
        .single();
      if (result.error)
        throw new ApiError(
          result.error.code === '23514' ? 'bad_request' : 'conflict',
          'Could not create task.',
        );
      return json({ task: view(result.data as TaskRow) }, 201);
    }

    const id = await requireId(request);
    if (request.method === 'PATCH') {
      const input = parseTaskUpdateRequest(await body(request));
      const update = {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.goalId === undefined ? {} : { goal_id: input.goalId }),
        ...(input.estimatedBlocks === undefined ? {} : { estimated_blocks: input.estimatedBlocks }),
        ...(input.status === undefined ? {} : { status: input.status }),
      };
      const result = await client
        .from('tasks')
        .update(update)
        .eq('owner_id', ownerId)
        .eq('id', id)
        .select(fields)
        .single();
      if (result.error)
        throw new ApiError(
          result.error.code === 'PGRST116' ? 'not_found' : 'bad_request',
          'Could not update task.',
        );
      return json({ task: view(result.data as TaskRow) });
    }
    method(request, ['DELETE']);
    const result = await client.from('tasks').delete().eq('owner_id', ownerId).eq('id', id);
    if (result.error) throw new ApiError('internal_error', 'Could not delete task.');
    return new Response(null, { status: 204 });
  }),
);
