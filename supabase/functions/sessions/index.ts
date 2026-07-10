import { createSessionHandlers } from '../_shared/handlers.ts';
import { body, json, method } from '../_shared/http.ts';
import { adminClient, handle, repositoryForClient, requireUser } from '../_shared/supabase.ts';
import { parseSessionCommand, parseSessionStartRequest } from '../_vendor/core/index.ts';

Deno.serve((request) =>
  handle(request, async () => {
    const { ownerId } = await requireUser(request);
    const repository = repositoryForClient(adminClient());
    const handlers = createSessionHandlers(repository);
    const now = Date.now();

    if (request.method === 'GET') {
      const session = await handlers.current({ ownerId, now });
      return json({ session, serverNow: new Date(now).toISOString() });
    }
    if (request.method === 'POST') {
      const input = parseSessionStartRequest(await body(request));
      const session = await handlers.start({ ownerId, now }, input);
      return json({ session, serverNow: new Date(now).toISOString() }, 201);
    }

    method(request, ['PATCH']);
    const command = parseSessionCommand(await body(request));
    const session = await handlers.command({ ownerId, now }, command);
    return json({ session, serverNow: new Date(now).toISOString() });
  }),
);
