import { NextResponse } from 'next/server';
import { SEATS } from '@/lib/room/constants';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(_request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = await params;
  const supabase = createServerSupabase();
  const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();

  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });
  if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });

  const { data: members, error: membersError } = await supabase.from('room_members').select('seat').eq('room_id', room.id);

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

  const takenSeats = new Set((members ?? []).map((member) => member.seat).filter(Boolean));
  const allSeatsReady = SEATS.every((seat) => takenSeats.has(seat));

  if (!allSeatsReady) {
    return NextResponse.json({ error: 'Faltan puestos por ocupar' }, { status: 409 });
  }

  const { error } = await supabase
    .from('game_state')
    .update({
      phase: 'playing',
      current_turn_seat: 'north',
      status_text: 'Partida iniciada. Turno: north',
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', room.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
