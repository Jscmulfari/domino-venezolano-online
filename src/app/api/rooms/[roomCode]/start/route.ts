import { dealHands } from '@/lib/domino/game';
import { SEATS } from '@/lib/room/constants';
import { createServerSupabase } from '@/lib/supabase/server';
import { jsonError, jsonOk, withJsonErrors } from '@/lib/server/api';

export async function POST(_request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  return withJsonErrors(async () => {
    const { roomCode } = await params;
    const supabase = createServerSupabase();
    const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();

    if (roomError) return jsonError(roomError.message, 500);
    if (!room) return jsonError('Sala no encontrada', 404);

    const { data: members, error: membersError } = await supabase.from('room_members').select('seat').eq('room_id', room.id);
    if (membersError) return jsonError(membersError.message, 500);

    const takenSeats = new Set((members ?? []).map((member) => member.seat).filter(Boolean));
    const allSeatsReady = SEATS.every((seat) => takenSeats.has(seat));

    if (!allSeatsReady) return jsonError('Faltan puestos por ocupar', 409);

    const handsBySeat = dealHands();
    const { error } = await supabase
      .from('game_state')
      .update({
        phase: 'playing',
        current_turn_seat: 'north',
        board: [],
        payload: {
          board: [],
          handsBySeat,
          currentTurnSeat: 'north',
          winnerSeat: null,
        },
        status_text: 'Partida iniciada. Turno: north',
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', room.id);

    if (error) return jsonError(error.message, 500);

    return jsonOk({ ok: true });
  });
}
