import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(request: Request) {
  const body = (await request.json()) as { displayName?: string; roomName?: string; sessionId?: string };
  const displayName = body.displayName?.trim();
  const roomName = body.roomName?.trim() || 'Sala privada';
  const sessionId = body.sessionId?.trim();

  if (!displayName || !sessionId) {
    return NextResponse.json({ error: 'displayName y sessionId son requeridos' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  let roomCode = makeRoomCode();

  for (let index = 0; index < 5; index += 1) {
    const { data: existing } = await supabase.from('rooms').select('id').eq('code', roomCode).maybeSingle();
    if (!existing) break;
    roomCode = makeRoomCode();
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code: roomCode, name: roomName, host_session_id: sessionId })
    .select('id, code')
    .single();

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  const [memberResult, gameResult] = await Promise.all([
    supabase.from('room_members').insert({ room_id: room.id, session_id: sessionId, display_name: displayName, online: true }),
    supabase.from('game_state').insert({ room_id: room.id }),
  ]);

  if (memberResult.error) {
    return NextResponse.json({ error: memberResult.error.message }, { status: 500 });
  }

  if (gameResult.error) {
    return NextResponse.json({ error: gameResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ roomCode: room.code });
}
