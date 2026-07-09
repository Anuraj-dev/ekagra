import { parseDeviceActionRequest } from '../../../packages/core/src/index.ts';
import { createSessionHandlers } from '../_shared/handlers.ts';
import { body, json, method } from '../_shared/http.ts';
import { adminClient, deviceForToken, handle, repositoryForClient } from '../_shared/supabase.ts';

Deno.serve((request) =>
  handle(request, async () => {
    method(request, ['POST']);
    const token =
      request.headers.get('x-device-token') ??
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
      '';
    const { ownerId } = await deviceForToken(token);
    const action = parseDeviceActionRequest(await body(request));
    const repository = repositoryForClient(adminClient());
    const handlers = createSessionHandlers(repository);
    const now = Date.now();
    if (action.action === 'start_next_planned') {
      const task = await repository.getNextPlannedTask(ownerId);
      if (task === null) return json({ session: null, serverNow: new Date(now).toISOString() });
      const session = await handlers.start({ ownerId, now }, { taskId: task.id });
      return json({ session, serverNow: new Date(now).toISOString() });
    }
    const session = await handlers.command({ ownerId, now }, { action: 'pause' });
    return json({ session, serverNow: new Date(now).toISOString() });
  }),
);
