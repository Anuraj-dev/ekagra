import { ApiError, body, json, method } from '../_shared/http.ts';
import { adminClient, databaseApiError, handle, requireUser } from '../_shared/supabase.ts';
import { parseFriendActionRequest, parseFriendInviteRequest } from '../_vendor/core/index.ts';

function direction(
  row: { requester_id: string; addressee_id: string; status: string },
  ownerId: string,
) {
  if (row.status === 'accepted') return 'friend';
  return row.requester_id === ownerId ? 'outgoing' : 'incoming';
}

type FriendRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  requester: { display_name: string } | null;
  addressee: { display_name: string } | null;
};

Deno.serve((request) =>
  handle(request, async () => {
    const { ownerId } = await requireUser(request);
    const client = adminClient();

    if (request.method === 'GET') {
      const result = await client
        .from('friendships')
        .select(
          'id,requester_id,addressee_id,status,created_at,requester:profiles!friendships_requester_id_fkey(display_name),addressee:profiles!friendships_addressee_id_fkey(display_name)',
        )
        .or(`requester_id.eq.${ownerId},addressee_id.eq.${ownerId}`)
        .order('updated_at', { ascending: false });
      if (result.error) throw databaseApiError(result.error, 'Could not load friends.');
      return json({
        friends: ((result.data as FriendRow[]) ?? []).map((row) => {
          const otherId = row.requester_id === ownerId ? row.addressee_id : row.requester_id;
          const profile = row.requester_id === ownerId ? row.addressee : row.requester;
          return {
            id: row.id,
            userId: otherId,
            displayName: profile?.display_name ?? 'Focus user',
            status: row.status,
            direction: direction(row, ownerId),
          };
        }),
      });
    }

    method(request, ['POST']);
    const action = new URL(request.url).searchParams.get('action');
    if (action === 'invite') {
      const input = parseFriendInviteRequest(await body(request));
      let addresseeId = input.userId;
      if (input.email) {
        const users = await client.auth.admin.listUsers({ perPage: 1000 });
        if (users.error) throw new ApiError('internal_error', 'Could not find that user.');
        addresseeId = users.data.users.find(
          (user) => user.email?.toLowerCase() === input.email,
        )?.id;
      }
      if (!addresseeId) throw new ApiError('not_found', 'No user matches that invitation.');
      if (addresseeId === ownerId) throw new ApiError('bad_request', 'You cannot invite yourself.');
      const result = await client
        .from('friendships')
        .insert({ requester_id: ownerId, addressee_id: addresseeId, status: 'pending' })
        .select('id,requester_id,addressee_id,status')
        .single();
      if (result.error) throw databaseApiError(result.error, 'Could not create invitation.');
      return json({ friendship: result.data }, 201);
    }

    const input = parseFriendActionRequest(await body(request));
    if (action !== input.action)
      throw new ApiError('bad_request', 'Action query does not match body.');
    const existing = await client
      .from('friendships')
      .select('id,requester_id,addressee_id,status')
      .eq('id', input.friendshipId)
      .or(`requester_id.eq.${ownerId},addressee_id.eq.${ownerId}`)
      .single();
    if (existing.error) throw databaseApiError(existing.error, 'Friendship not found.');
    if (input.action === 'accept') {
      if (existing.data.addressee_id !== ownerId || existing.data.status !== 'pending') {
        throw new ApiError('forbidden', 'Only a pending recipient can accept an invitation.');
      }
      const result = await client
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', input.friendshipId)
        .select('id,status')
        .single();
      if (result.error) throw databaseApiError(result.error, 'Could not accept invitation.');
      return json({ friendship: result.data });
    }
    const result = await client
      .from('friendships')
      .delete()
      .eq('id', input.friendshipId)
      .select('id')
      .single();
    if (result.error) throw databaseApiError(result.error, 'Could not remove friend.');
    return json({ removed: true });
  }),
);
