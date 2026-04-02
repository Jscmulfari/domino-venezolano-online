import { SEATS } from '@/lib/room/constants';
import type { Seat } from '@/lib/domino/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { jsonError, jsonOk, readJsonBody, withJsonErrors } from '@/lib/server/api';

export async function POST(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  return withJsonErrors(async () => {
    const { roomCode } = await params;
    const body = await readJsonBody<{ seat?: Seat; sessionId?: string }>(request);
    const seat = body.seat;
    const sessionId = body.sessionId?.trim();

    if (!sessionId || !seat || !SEATS.includes(seat)) {
      return jsonError('seat y sessionId son requeridos', 400);
    }

    const supabase = createServerSupabase();
    const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();

    if (roomError) return jsonError(roomError.message, 500);
    if (!room) return jsonError('Sala no encontrada', 404);

    const { data: seatOwner, error: seatError } = await supabase
      .from('room_members')
      .select('session_id')
      .eq('room_id', room.id)
      .eq('seat', seat)
      .maybeSingle();

    if (seatError) return jsonError(seatError.message, 500);
    if (seatOwner && seatOwner.session_id !== sessionId) {
      return jsonError('Puesto ocupado', 409);
    }

    const { data: updatedMembers, error } = await supabase
      .from('room_members')
      .update({ seat, updated_at: new Date().toISOString(), online: true })
      .eq('room_id', room.id)
      .eq('session_id', sessionId)
      .select('id');

    if (error) return jsonError(error.message, 500);
    if (!updatedMembers?.length) return jsonError('Jugador no pertenece a la sala', 404);

    return jsonOk({ ok: true });
  });
}
