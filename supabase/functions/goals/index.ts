import { ApiError, body, json, method } from '../_shared/http.ts';
import { databaseApiError, handle, requireUser } from '../_shared/supabase.ts';
import type { GoalRow } from '../_shared/types.ts';
import {
  type Goal,
  parseGoalCreateRequest,
  parseGoalUpdateRequest,
  parseUuid,
} from '../_vendor/core/index.ts';

const fields =
  'id,title,identity_id,identity_role,deadline,priority,archived_at,created_at,updated_at';

function view(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    identityId: row.identity_id,
    identityRole: row.identity_role,
    deadline: row.deadline,
    priority: row.priority,
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
      if (result.error) throw databaseApiError(result.error, 'Could not load goals.');
      return json({ goals: (result.data as GoalRow[]).map(view) });
    }
    if (request.method === 'POST') {
      const input = parseGoalCreateRequest(await body(request));
      const result = await client
        .from('goals')
        .insert({
          owner_id: ownerId,
          title: input.title,
          // The goals identity trigger resolves whichever seam the client sent and
          // keeps identity_role mirrored, so only the provided one is written.
          ...(input.identityId === undefined ? {} : { identity_id: input.identityId }),
          ...(input.identityRole === undefined ? {} : { identity_role: input.identityRole }),
          deadline: input.deadline ?? null,
          priority: input.priority ?? null,
          client_op_id: input.clientOpId ?? null,
        })
        .select(fields)
        .single();
      if (result.error) {
        if (input.clientOpId && (result.error as { code?: string }).code === '23505') {
          const existing = await client
            .from('goals')
            .select(fields)
            .eq('owner_id', ownerId)
            .eq('client_op_id', input.clientOpId)
            .single();
          if (existing.error) throw databaseApiError(existing.error, 'Could not load goal.');
          return json({ goal: view(existing.data as GoalRow) }, 200);
        }
        throw databaseApiError(result.error, 'Could not create goal.');
      }
      return json({ goal: view(result.data as GoalRow) }, 201);
    }
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new ApiError('bad_request', 'id query parameter is required.');
    const goalId = parseUuid(id, 'id');
    if (request.method === 'PATCH') {
      const input = parseGoalUpdateRequest(await body(request));
      const update = {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.identityId === undefined ? {} : { identity_id: input.identityId }),
        ...(input.identityRole === undefined ? {} : { identity_role: input.identityRole }),
        ...(input.deadline === undefined ? {} : { deadline: input.deadline }),
        ...(input.priority === undefined ? {} : { priority: input.priority }),
      };
      const result = await client
        .from('goals')
        .update(update)
        .eq('owner_id', ownerId)
        .eq('id', goalId)
        .select(fields)
        .single();
      if (result.error) throw databaseApiError(result.error, 'Could not update goal.');
      return json({ goal: view(result.data as GoalRow) });
    }
    method(request, ['DELETE']);
    const result = await client
      .from('goals')
      .delete()
      .eq('owner_id', ownerId)
      .eq('id', goalId)
      .select('id')
      .single();
    if (result.error) throw databaseApiError(result.error, 'Could not delete goal.');
    return new Response(null, { status: 204 });
  }),
);
