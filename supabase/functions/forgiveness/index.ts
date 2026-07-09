import { parseForgivenessApplyRequest } from '../../../packages/core/src/index.ts';
import { ApiError, body, json, method } from '../_shared/http.ts';
import { handle, requireUser } from '../_shared/supabase.ts';

Deno.serve((request) =>
  handle(request, async () => {
    method(request, ['POST']);
    const { client } = await requireUser(request);
    const input = parseForgivenessApplyRequest(await body(request));
    const result = await client.rpc('apply_forgiveness_token', { p_reason: input.reason ?? null });
    if (result.error) {
      if (result.error.code === '23514')
        throw new ApiError('conflict', 'This week’s forgiveness token is already used.');
      throw new ApiError('internal_error', 'Could not apply the forgiveness token.');
    }
    return json({ applied: true, weekStart: result.data.week_start, usedAt: result.data.used_at });
  }),
);
