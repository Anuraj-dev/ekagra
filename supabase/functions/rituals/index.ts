import { ApiError, body, json, method } from '../_shared/http.ts';
import { adminClient, databaseApiError, handle, requireUser } from '../_shared/supabase.ts';
import { parseEveningCloseRequest, parseMorningCommitRequest } from '../_vendor/core/index.ts';

Deno.serve((request) =>
  handle(request, async () => {
    method(request, ['POST']);
    const ritual = new URL(request.url).searchParams.get('ritual');
    const { ownerId } = await requireUser(request);
    const client = adminClient();

    if (ritual === 'morning-commit') {
      const input = parseMorningCommitRequest(await body(request));
      const result = await client.rpc('commit_morning_plan', {
        p_owner_id: ownerId,
        p_task_ids: input.taskIds,
      });
      if (result.error) throw databaseApiError(result.error, 'Could not save the morning commit.');
      return json({ ritual: 'morning-commit', dayRecord: result.data });
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
