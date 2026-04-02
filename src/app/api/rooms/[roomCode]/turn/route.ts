import { canPlayOnSide, nextSeat, normalizeGamePayload, orientTile } from '@/lib/domino/game';
import type { Seat } from '@/lib/domino/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { jsonError, jsonOk, readJsonBody, withJsonErrors } from '@/lib/server/api';

export async function POST(request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  return withJsonErrors(async () => {
    const { roomCode } = await params;
    const body = await readJsonBody<{ tileId?: string; side?: 'left' | 'right'; sessionId?: string }>(request);
    const tileId = body.tileId?.trim();
    const side = body.side;
    const sessionId = body.sessionId?.trim();

    if (!tileId || !side || !sessionId) {
      return jsonError('tileId, side y sessionId son requeridos', 400);
    }

    const supabase = createServerSupabase();
    const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();
    if (roomError) return jsonError(roomError.message, 500);
    if (!room) return jsonError('Sala no encontrada', 404);

    const [{ data: member, error: memberError }, { data: game, error: gameError }] = await Promise.all([
      supabase.from('room_members').select('seat').eq('room_id', room.id).eq('session_id', sessionId).maybeSingle(),
      supabase.from('game_state').select('payload, phase').eq('room_id', room.id).single(),
    ]);

    if (memberError) return jsonError(memberError.message, 500);
    if (!member?.seat) return jsonError('Jugador sin puesto asignado', 409);
    if (gameError) return jsonError(gameError.message, 500);
    if (game.phase !== 'playing') return jsonError('La partida no ha comenzado', 409);

    const playerSeat = member.seat as Seat;
    const payload = normalizeGamePayload(game.payload);

    if (payload.currentTurnSeat !== playerSeat) {
      return jsonError('No es tu turno', 409);
    }

    const hand = payload.handsBySeat[playerSeat] ?? [];
    const tile = hand.find((candidate) => candidate.id === tileId);
    if (!tile) return jsonError('Ficha no disponible en tu mano', 404);
    if (!canPlayOnSide(tile, side, payload.board)) return jsonError('Jugada inválida para esa punta', 409);

    const playedTile = { ...orientTile(tile, side, payload.board), placedBy: playerSeat };
    const updatedBoard = side === 'left' ? [playedTile, ...payload.board] : [...payload.board, playedTile];
    const updatedHand = hand.filter((candidate) => candidate.id !== tileId);
    const winnerSeat = updatedHand.length === 0 ? playerSeat : null;
    const upcomingSeat = winnerSeat ? null : nextSeat(playerSeat);

    const { error } = await supabase
      .from('game_state')
      .update({
        current_turn_seat: upcomingSeat,
        payload: {
          board: updatedBoard,
          handsBySeat: {
            ...payload.handsBySeat,
            [playerSeat]: updatedHand,
          },
          currentTurnSeat: upcomingSeat,
          winnerSeat,
        },
        phase: winnerSeat ? 'finished' : 'playing',
        status_text: winnerSeat ? `Ganó ${playerSeat}` : `Turno: ${upcomingSeat}`,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', room.id);

    if (error) return jsonError(error.message, 500);

    return jsonOk({ ok: true });
  });
}
