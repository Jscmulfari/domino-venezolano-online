import { makeBotIdentity } from '@/lib/domino/game';
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

    const occupiedSeats = new Set((members ?? []).map((member) => member.seat).filter(Boolean));
    const inserts = SEATS.filter((seat) => !occupiedSeats.has(seat)).map((seat) => {
      const bot = makeBotIdentity(seat);
      return {
        room_id: room.id,
        session_id: bot.sessionId,
        display_name: bot.displayName,
        seat,
        online: true,
        updated_at: new Date().toISOString(),
      };
    });

    if (inserts.length === 0) return jsonOk({ ok: true, added: 0 });

    const { error } = await supabase.from('room_members').upsert(inserts, { onConflict: 'room_id,session_id' });
    if (error) return jsonError(error.message, 500);

    return jsonOk({ ok: true, added: inserts.length });
  });
}
