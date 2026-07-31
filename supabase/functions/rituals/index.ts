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
      const committed = result.data as { planId?: string } | null;
      if (!committed?.planId) throw new ApiError('internal_error', 'Plan commit returned no plan.');
      return json({ ritual: 'morning-commit', planId: committed.planId });
    }

    if (ritual === 'evening-close') {
      const input = parseEveningCloseRequest(await body(request));
      const result = await client.rpc('close_today_plan', {
        p_owner_id: ownerId,
        p_plan_match: input.planMatch,
        p_went_wrong_tag: input.wentWrongTag,
        p_note: input.note ?? null,
      });
      if (result.error) throw databaseApiError(result.error, 'Could not save the evening close.');
      return json({ ritual: 'evening-close', planId: result.data });
    }

    throw new ApiError('bad_request', 'ritual must be morning-commit or evening-close.');
  }),
);
