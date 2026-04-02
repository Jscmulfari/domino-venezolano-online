import { SEATS } from '@/lib/room/constants';
import type { Seat } from '@/lib/domino/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { jsonError, jsonOk, readJsonBody, withJsonErrors } from '@/lib/server/api';

function nextSeat(seat: Seat | null) {
  if (!seat) return 'north' as const;
  const index = SEATS.indexOf(seat);
  return SEATS[(index + 1) % SEATS.length];
}

export async function POST(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  return withJsonErrors(async () => {
    const { roomCode } = await params;
    const body = await readJsonBody<{ tile?: { left?: number; right?: number } }>(request);
    const left = body.tile?.left;
    const right = body.tile?.right;

    if (typeof left !== 'number' || typeof right !== 'number') {
      return jsonError('tile.left y tile.right son requeridos', 400);
    }

    const supabase = createServerSupabase();
    const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();

    if (roomError) return jsonError(roomError.message, 500);
    if (!room) return jsonError('Sala no encontrada', 404);

    const { data: game, error: gameError } = await supabase.from('game_state').select('board, current_turn_seat, phase').eq('room_id', room.id).single();

    if (gameError) return jsonError(gameError.message, 500);
    if (game.phase !== 'playing') return jsonError('La partida no ha comenzado', 409);

    const board = Array.isArray(game.board) ? game.board : [];
    const updatedBoard = [...board, { left, right }];
    const upcomingSeat = nextSeat((game.current_turn_seat as Seat | null) ?? null);

    const { error } = await supabase
      .from('game_state')
      .update({
        board: updatedBoard,
        current_turn_seat: upcomingSeat,
        status_text: `Mesa sincronizada. Turno: ${upcomingSeat}`,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', room.id);

    if (error) return jsonError(error.message, 500);

    return jsonOk({ ok: true });
  });
}
