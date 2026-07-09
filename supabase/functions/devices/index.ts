import { ApiError, body, json, method } from '../_shared/http.ts';
import { adminClient, databaseApiError, handle, requireUser } from '../_shared/supabase.ts';
import {
  type DeviceRegistrationResponse,
  parseDeviceRegistrationRequest,
  parseUuid,
} from '../_vendor/core/index.ts';

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
    const query = new URL(request.url).searchParams;
    if (request.method === 'POST') {
      const id = query.get('id');
      if (id !== null) {
        if (query.get('action') !== null && query.get('action') !== 'rotate') {
          throw new ApiError('bad_request', 'Device POST with id only supports token rotation.');
        }
        const deviceId = parseUuid(id, 'id');
        const deviceToken = token();
        const result = await client
          .from('devices')
          .update({ token_hash: await hash(deviceToken), revoked_at: null })
          .eq('owner_id', ownerId)
          .eq('id', deviceId)
          .select('id')
          .single();
        if (result.error) throw databaseApiError(result.error, 'Could not rotate device token.');
        const response: DeviceRegistrationResponse = { deviceId: result.data.id, deviceToken };
        return json(response);
      }
      if (query.get('action') !== null) {
        throw new ApiError('bad_request', 'Device action requires a device id.');
      }
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
      if (result.error) throw databaseApiError(result.error, 'Could not register device.');
      const response: DeviceRegistrationResponse = { deviceId: result.data.id, deviceToken };
      return json(response, 201);
    }
    if (request.method === 'DELETE') {
      const id = query.get('id');
      if (!id) throw new ApiError('bad_request', 'id query parameter is required.');
      const deviceId = parseUuid(id, 'id');
      const result = await client
        .from('devices')
        .update({ revoked_at: new Date().toISOString() })
        .eq('owner_id', ownerId)
        .eq('id', deviceId)
        .select('id')
        .single();
      if (result.error) throw databaseApiError(result.error, 'Could not revoke device.');
      return new Response(null, { status: 204 });
    }
    method(request, ['GET']);
    const result = await client
      .from('devices')
      .select('id,label,revoked_at,last_seen_at,created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (result.error) throw databaseApiError(result.error, 'Could not load devices.');
    return json({ devices: result.data });
  }),
);
