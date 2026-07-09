import {
  type DeviceRegistrationResponse,
  parseDeviceRegistrationRequest,
} from '../../../packages/core/src/index.ts';
import { ApiError, body, json, method } from '../_shared/http.ts';
import { adminClient, handle, requireUser } from '../_shared/supabase.ts';

function token(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve((request) =>
  handle(request, async () => {
    const { ownerId } = await requireUser(request);
    const client = adminClient();
    if (request.method === 'POST') {
      const input = parseDeviceRegistrationRequest(await body(request));
      const deviceToken = token();
      const result = await client
        .from('devices')
        .insert({
          owner_id: ownerId,
          label: input.label ?? 'Desk companion',
          token_hash: await hash(deviceToken),
        })
        .select('id')
        .single();
      if (result.error) throw new ApiError('internal_error', 'Could not register device.');
      const response: DeviceRegistrationResponse = { deviceId: result.data.id, deviceToken };
      return json(response, 201);
    }
    method(request, ['GET']);
    const result = await client
      .from('devices')
      .select('id,label,revoked_at,last_seen_at,created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (result.error) throw new ApiError('internal_error', 'Could not load devices.');
    return json({ devices: result.data });
  }),
);
