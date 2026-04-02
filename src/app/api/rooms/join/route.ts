import { createServerSupabase } from '@/lib/supabase/server';
import { jsonError, jsonOk, readJsonBody, withJsonErrors } from '@/lib/server/api';

export async function POST(request: Request) {
  return withJsonErrors(async () => {
    const body = await readJsonBody<{ displayName?: string; roomCode?: string; sessionId?: string }>(request);
    const displayName = body.displayName?.trim();
    const roomCode = body.roomCode?.trim().toUpperCase();
    const sessionId = body.sessionId?.trim();

    if (!displayName || !roomCode || !sessionId) {
      return jsonError('displayName, roomCode y sessionId son requeridos', 400);
    }

    const supabase = createServerSupabase();

    const { data: room, error: roomError } = await supabase.from('rooms').select('id, code').eq('code', roomCode).maybeSingle();

    if (roomError) {
      return jsonError(roomError.message, 500);
    }

    if (!room) {
      return jsonError('Sala no encontrada', 404);
    }

    const { data: members, error: membersError } = await supabase.from('room_members').select('id').eq('room_id', room.id);

    if (membersError) {
      return jsonError(membersError.message, 500);
    }

    const memberCount = members?.length ?? 0;

    const { data: existingMember, error: existingMemberError } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', room.id)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingMemberError) {
      return jsonError(existingMemberError.message, 500);
    }

    if (!existingMember && memberCount >= 4) {
      return jsonError('Sala llena', 409);
    }

    const { error: upsertError } = await supabase.from('room_members').upsert(
      {
        room_id: room.id,
        session_id: sessionId,
        display_name: displayName,
        online: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,session_id' },
    );

    if (upsertError) {
      return jsonError(upsertError.message, 500);
    }

    return jsonOk({ roomCode: room.code, joined: !!existingMember });
  });
}
