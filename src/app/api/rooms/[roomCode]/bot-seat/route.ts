import { makeBotIdentity } from '@/lib/domino/game';
import { SEATS } from '@/lib/room/constants';
import type { Seat } from '@/lib/domino/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { jsonError, jsonOk, readJsonBody, withJsonErrors } from '@/lib/server/api';

export async function POST(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  return withJsonErrors(async () => {
    const { roomCode } = await params;
    const body = await readJsonBody<{ seat?: Seat }>(request);
    const seat = body.seat;

    if (!seat || !SEATS.includes(seat)) {
      return jsonError('seat es requerido', 400);
    }

    const supabase = createServerSupabase();
    const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();
    if (roomError) return jsonError(roomError.message, 500);
    if (!room) return jsonError('Sala no encontrada', 404);

    const { data: seatOwner, error: seatError } = await supabase.from('room_members').select('session_id').eq('room_id', room.id).eq('seat', seat).maybeSingle();
    if (seatError) return jsonError(seatError.message, 500);
    if (seatOwner) return jsonError('Puesto ocupado', 409);

    const bot = makeBotIdentity(seat);
    const { error } = await supabase.from('room_members').upsert(
      {
        room_id: room.id,
        session_id: bot.sessionId,
        display_name: bot.displayName,
        seat,
        online: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,session_id' },
    );

    if (error) return jsonError(error.message, 500);
    return jsonOk({ ok: true });
  });
}
