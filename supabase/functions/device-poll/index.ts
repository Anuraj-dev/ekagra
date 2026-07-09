import { createDevicePollHandler } from '../_shared/handlers.ts';
import { json, method } from '../_shared/http.ts';
import { adminClient, deviceForToken, handle, repositoryForClient } from '../_shared/supabase.ts';

Deno.serve((request) =>
  handle(request, async () => {
    method(request, ['GET']);
    const token =
      request.headers.get('x-device-token') ??
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
      '';
    const { ownerId } = await deviceForToken(token);
    const repository = repositoryForClient(adminClient());
    const payload = await createDevicePollHandler(repository)({ ownerId, now: Date.now() });
    return json(payload);
  }),
);
