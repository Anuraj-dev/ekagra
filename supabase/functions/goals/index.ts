import {
  type Goal,
  parseGoalCreateRequest,
  parseGoalUpdateRequest,
} from '../../../packages/core/src/index.ts';
import { ApiError, body, json, method } from '../_shared/http.ts';
import { handle, requireUser } from '../_shared/supabase.ts';
import type { GoalRow } from '../_shared/types.ts';

const fields = 'id,title,identity_role,deadline,archived_at,created_at,updated_at';

function view(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    identityRole: row.identity_role,
    deadline: row.deadline,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

Deno.serve((request) =>
  handle(request, async () => {
    const { client, ownerId } = await requireUser(request);
    if (request.method === 'GET') {
      const result = await client
        .from('goals')
        .select(fields)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (result.error) throw new ApiError('internal_error', 'Could not load goals.');
      return json({ goals: (result.data as GoalRow[]).map(view) });
    }
    if (request.method === 'POST') {
      const input = parseGoalCreateRequest(await body(request));
      const result = await client
        .from('goals')
        .insert({
          owner_id: ownerId,
          title: input.title,
          identity_role: input.identityRole,
          deadline: input.deadline ?? null,
        })
        .select(fields)
        .single();
      if (result.error) throw new ApiError('bad_request', 'Could not create goal.');
      return json({ goal: view(result.data as GoalRow) }, 201);
    }
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new ApiError('bad_request', 'id query parameter is required.');
    if (request.method === 'PATCH') {
      const input = parseGoalUpdateRequest(await body(request));
      const update = {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.identityRole === undefined ? {} : { identity_role: input.identityRole }),
        ...(input.deadline === undefined ? {} : { deadline: input.deadline }),
      };
      const result = await client
        .from('goals')
        .update(update)
        .eq('owner_id', ownerId)
        .eq('id', id)
        .select(fields)
        .single();
      if (result.error)
        throw new ApiError(
          result.error.code === 'PGRST116' ? 'not_found' : 'bad_request',
          'Could not update goal.',
        );
      return json({ goal: view(result.data as GoalRow) });
    }
    method(request, ['DELETE']);
    const result = await client.from('goals').delete().eq('owner_id', ownerId).eq('id', id);
    if (result.error) throw new ApiError('internal_error', 'Could not delete goal.');
    return new Response(null, { status: 204 });
  }),
);
