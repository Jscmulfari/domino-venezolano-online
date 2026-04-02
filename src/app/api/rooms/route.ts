import { createServerSupabase } from '@/lib/supabase/server';
import { jsonError, jsonOk, readJsonBody, withJsonErrors } from '@/lib/server/api';

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(request: Request) {
  return withJsonErrors(async () => {
    const body = await readJsonBody<{ displayName?: string; roomName?: string; sessionId?: string }>(request);
    const displayName = body.displayName?.trim();
    const roomName = body.roomName?.trim() || 'Sala privada';
    const sessionId = body.sessionId?.trim();

    if (!displayName || !sessionId) {
      return jsonError('displayName y sessionId son requeridos', 400);
    }

    const supabase = createServerSupabase();

    let roomCode = makeRoomCode();

    for (let index = 0; index < 5; index += 1) {
      const { data: existing, error } = await supabase.from('rooms').select('id').eq('code', roomCode).maybeSingle();
      if (error) throw error;
      if (!existing) break;
      roomCode = makeRoomCode();
    }

    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({ code: roomCode, name: roomName, host_session_id: sessionId })
      .select('id, code')
      .single();

    if (roomError) {
      return jsonError(roomError.message, 500);
    }

    const [memberResult, gameResult] = await Promise.all([
      supabase.from('room_members').insert({ room_id: room.id, session_id: sessionId, display_name: displayName, online: true }),
      supabase.from('game_state').insert({ room_id: room.id }),
    ]);

    if (memberResult.error) {
      return jsonError(memberResult.error.message, 500);
    }

    if (gameResult.error) {
      return jsonError(gameResult.error.message, 500);
    }

    return jsonOk({ roomCode: room.code });
  });
}
