import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const body = (await request.json()) as { authorName?: string; sessionId?: string; text?: string };
  const authorName = body.authorName?.trim();
  const sessionId = body.sessionId?.trim();
  const text = body.text?.trim();

  if (!authorName || !sessionId || !text) {
    return NextResponse.json({ error: 'authorName, sessionId y text son requeridos' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });
  if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });

  const { error } = await supabase.from('chat_messages').insert({
    room_id: room.id,
    session_id: sessionId,
    author_name: authorName,
    body: text,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
