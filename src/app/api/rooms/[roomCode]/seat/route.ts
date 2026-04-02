import { NextResponse } from 'next/server';
import { SEATS } from '@/lib/room/constants';
import type { Seat } from '@/lib/domino/types';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const body = (await request.json()) as { seat?: Seat; sessionId?: string };
  const seat = body.seat;
  const sessionId = body.sessionId?.trim();

  if (!sessionId || !seat || !SEATS.includes(seat)) {
    return NextResponse.json({ error: 'seat y sessionId son requeridos' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });
  if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });

  const { data: seatOwner, error: seatError } = await supabase
    .from('room_members')
    .select('session_id')
    .eq('room_id', room.id)
    .eq('seat', seat)
    .maybeSingle();

  if (seatError) return NextResponse.json({ error: seatError.message }, { status: 500 });
  if (seatOwner && seatOwner.session_id !== sessionId) {
    return NextResponse.json({ error: 'Puesto ocupado' }, { status: 409 });
  }

  const { error } = await supabase
    .from('room_members')
    .update({ seat, updated_at: new Date().toISOString(), online: true })
    .eq('room_id', room.id)
    .eq('session_id', sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
