import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = (await request.json()) as { displayName?: string; roomCode?: string; sessionId?: string };
  const displayName = body.displayName?.trim();
  const roomCode = body.roomCode?.trim().toUpperCase();
  const sessionId = body.sessionId?.trim();

  if (!displayName || !roomCode || !sessionId) {
    return NextResponse.json({ error: 'displayName, roomCode y sessionId son requeridos' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data: room, error: roomError } = await supabase.from('rooms').select('id, code').eq('code', roomCode).maybeSingle();

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  if (!room) {
    return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
  }

  const { data: members, error: membersError } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', room.id);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const memberCount = members?.length ?? 0;

  const { data: existingMember } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', room.id)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (!existingMember && memberCount >= 4) {
    return NextResponse.json({ error: 'Sala llena' }, { status: 409 });
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
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ roomCode: room.code, joined: !!existingMember });
}
