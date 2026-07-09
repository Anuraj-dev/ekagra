import {
  parseEveningCloseRequest,
  parseMorningCommitRequest,
} from '../../../packages/core/src/index.ts';
import { ApiError, body, json, method } from '../_shared/http.ts';
import { adminClient, handle, requireUser } from '../_shared/supabase.ts';

Deno.serve((request) =>
  handle(request, async () => {
    method(request, ['POST']);
    const ritual = new URL(request.url).searchParams.get('ritual');
    const { ownerId } = await requireUser(request);
    const client = adminClient();

    if (ritual === 'morning-commit') {
      const input = parseMorningCommitRequest(await body(request));
      const tasks = await client
        .from('tasks')
        .select('id,status')
        .eq('owner_id', ownerId)
        .in('id', input.taskIds);
      if (tasks.error) throw new ApiError('internal_error', 'Could not verify morning tasks.');
      if (
        (tasks.data?.length ?? 0) !== input.taskIds.length ||
        tasks.data?.some((task) => !['inbox', 'planned'].includes(task.status))
      ) {
        throw new ApiError('bad_request', 'Morning commit tasks must belong to you and be open.');
      }

      const clearPlan = await client
        .from('tasks')
        .update({ status: 'inbox' })
        .eq('owner_id', ownerId)
        .eq('status', 'planned');
      if (clearPlan.error)
        throw new ApiError('internal_error', 'Could not reset the previous morning plan.');
      const setPlan = await client
        .from('tasks')
        .update({ status: 'planned' })
        .eq('owner_id', ownerId)
        .in('id', input.taskIds);
      if (setPlan.error) throw new ApiError('internal_error', 'Could not save the morning plan.');
      const record = await client
        .from('day_records')
        .upsert(
          { owner_id: ownerId, morning_task_ids: input.taskIds },
          { onConflict: 'owner_id,record_date' },
        )
        .select('record_date,morning_task_ids,plan_match,went_wrong_tag,note,updated_at')
        .single();
      if (record.error) throw new ApiError('internal_error', 'Could not save the morning commit.');
      return json({ ritual: 'morning-commit', dayRecord: record.data });
    }

    if (ritual === 'evening-close') {
      const input = parseEveningCloseRequest(await body(request));
      const record = await client
        .from('day_records')
        .upsert(
          {
            owner_id: ownerId,
            plan_match: input.planMatch,
            went_wrong_tag: input.wentWrongTag,
            note: input.note ?? null,
          },
          { onConflict: 'owner_id,record_date' },
        )
        .select('record_date,morning_task_ids,plan_match,went_wrong_tag,note,updated_at')
        .single();
      if (record.error) throw new ApiError('internal_error', 'Could not save the evening close.');
      return json({ ritual: 'evening-close', dayRecord: record.data });
    }

    throw new ApiError('bad_request', 'ritual must be morning-commit or evening-close.');
  }),
);
