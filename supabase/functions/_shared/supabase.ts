import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { ApiError, failure } from './http.ts';
import type { DeviceRecord, SessionRepository, SessionRow, TaskRow } from './types.ts';

const sessionSelect = '*, task:tasks(title)';

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function databaseError(error: { code?: string; message?: string }): never {
  if (error.code === '23505') throw new ApiError('conflict', 'That record already exists.');
  if (error.code === '23514')
    throw new ApiError('bad_request', error.message ?? 'Database validation failed.');
  throw new ApiError('internal_error', 'Database request failed.');
}

function row<T>(data: T | null, error: { code?: string; message?: string } | null): T {
  if (error) return databaseError(error);
  if (data === null) throw new ApiError('internal_error', 'Database returned no row.');
  return data;
}

function optionalRow<T>(
  data: T | null,
  error: { code?: string; message?: string } | null,
): T | null {
  if (error) return databaseError(error);
  return data;
}

function sessionRepository(client: SupabaseClient): SessionRepository {
  return {
    async getTask(ownerId, taskId) {
      const result = await client
        .from('tasks')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('id', taskId)
        .maybeSingle();
      return optionalRow(result.data as TaskRow | null, result.error);
    },
    async getActiveSession(ownerId) {
      const result = await client
        .from('sessions')
        .select(sessionSelect)
        .eq('owner_id', ownerId)
        .is('ended_at', null)
        .maybeSingle();
      return optionalRow(result.data as SessionRow | null, result.error);
    },
    async insertSession(input) {
      const result = await client
        .from('sessions')
        .insert({
          owner_id: input.ownerId,
          task_id: input.taskId,
          planned_minutes: input.plannedMinutes,
          started_at: input.startedAt,
          running_since: input.startedAt,
          active_milliseconds: 0,
        })
        .select(sessionSelect)
        .single();
      return row(result.data as SessionRow | null, result.error);
    },
    async updateSession(ownerId, sessionId, patch) {
      const result = await client
        .from('sessions')
        .update(patch)
        .eq('owner_id', ownerId)
        .eq('id', sessionId)
        .is('ended_at', null)
        .select(sessionSelect)
        .single();
      return row(result.data as SessionRow | null, result.error);
    },
    async ensureDayRecord(ownerId) {
      const result = await client
        .from('day_records')
        .upsert(
          { owner_id: ownerId },
          { onConflict: 'owner_id,record_date', ignoreDuplicates: true },
        );
      if (result.error) return databaseError(result.error);
    },
    async getTodayBlocks(ownerId) {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const result = await client
        .from('sessions')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('outcome', 'completed')
        .gte('started_at', start.toISOString());
      if (result.error) return databaseError(result.error);
      return result.data?.length ?? 0;
    },
    async getWeeklyMinutes(ownerId) {
      const start = new Date();
      const day = start.getUTCDay();
      start.setUTCDate(start.getUTCDate() - (day === 0 ? 6 : day - 1));
      start.setUTCHours(0, 0, 0, 0);
      const result = await client
        .from('sessions')
        .select('honest_minutes')
        .eq('owner_id', ownerId)
        .not('ended_at', 'is', null)
        .gte('started_at', start.toISOString());
      if (result.error) return databaseError(result.error);
      return (result.data ?? []).reduce(
        (total, session) => total + Number(session.honest_minutes ?? 0),
        0,
      );
    },
    async getNextPlannedTask(ownerId) {
      const result = await client
        .from('tasks')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('status', 'planned')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      return optionalRow(result.data as TaskRow | null, result.error);
    },
  };
}

export function userClient(request: Request): { client: SupabaseClient; token: string } {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer '))
    throw new ApiError('unauthorized', 'Bearer token required.');
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) throw new ApiError('unauthorized', 'Bearer token required.');
  return {
    token,
    client: createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
    }),
  };
}

export async function requireUser(request: Request): Promise<{
  client: SupabaseClient;
  ownerId: string;
  repository: SessionRepository;
}> {
  const { client, token } = userClient(request);
  const result = await client.auth.getUser(token);
  if (result.error || !result.data.user)
    throw new ApiError('unauthorized', 'Invalid access token.');
  return { client, ownerId: result.data.user.id, repository: sessionRepository(client) };
}

export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
}

export function repositoryForClient(client: SupabaseClient): SessionRepository {
  return sessionRepository(client);
}

export async function deviceForToken(
  token: string,
): Promise<{ device: DeviceRecord; ownerId: string }> {
  if (token.length < 32) throw new ApiError('unauthorized', 'Invalid device token.');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const tokenHash = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const client = adminClient();
  const result = await client
    .from('devices')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .single();
  if (result.error?.code === 'PGRST116')
    throw new ApiError('unauthorized', 'Invalid device token.');
  const device = row(result.data as DeviceRecord | null, result.error);
  await client
    .from('devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', device.id);
  return { device, ownerId: device.owner_id };
}

export function handle(request: Request, callback: () => Promise<Response>): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return Promise.resolve(new Response(null, { status: 204, headers: corsHeaders() }));
  }
  return callback()
    .then((response) => withCors(response))
    .catch((error) => withCors(failure(error)));
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, headers });
}

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-device-token, apikey, content-type',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };
}
