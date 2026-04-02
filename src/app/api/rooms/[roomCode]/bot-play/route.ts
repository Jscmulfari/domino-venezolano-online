import { chooseBotMove, isBotSessionId, nextSeat, normalizeGamePayload, orientTile } from '@/lib/domino/game';
import type { Seat } from '@/lib/domino/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { jsonError, jsonOk, withJsonErrors } from '@/lib/server/api';

export async function POST(_request: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  return withJsonErrors(async () => {
    const { roomCode } = await params;
    const supabase = createServerSupabase();
    const { data: room, error: roomError } = await supabase.from('rooms').select('id').eq('code', roomCode.toUpperCase()).maybeSingle();
    if (roomError) return jsonError(roomError.message, 500);
    if (!room) return jsonError('Sala no encontrada', 404);

    const [{ data: game, error: gameError }, { data: members, error: membersError }] = await Promise.all([
      supabase.from('game_state').select('payload, phase').eq('room_id', room.id).single(),
      supabase.from('room_members').select('seat, session_id').eq('room_id', room.id),
    ]);

    if (gameError) return jsonError(gameError.message, 500);
    if (membersError) return jsonError(membersError.message, 500);
    if (game.phase !== 'playing') return jsonOk({ ok: true, moved: false, reason: 'game-not-playing' });

    const payload = normalizeGamePayload(game.payload);
    const turnSeat = payload.currentTurnSeat;
    if (!turnSeat) return jsonOk({ ok: true, moved: false, reason: 'no-turn' });

    const botMember = (members ?? []).find((member) => member.seat === turnSeat && isBotSessionId(member.session_id));
    if (!botMember) return jsonOk({ ok: true, moved: false, reason: 'turn-not-bot' });

    const hand = payload.handsBySeat[turnSeat as Seat] ?? [];
    const move = chooseBotMove(hand, payload.board);
    if (!move) {
      const upcomingSeat = nextSeat(turnSeat as Seat);
      const { error } = await supabase
        .from('game_state')
        .update({
          current_turn_seat: upcomingSeat,
          payload: {
            ...payload,
            currentTurnSeat: upcomingSeat,
          },
          status_text: `CPU pasó. Turno: ${upcomingSeat}`,
          updated_at: new Date().toISOString(),
        })
        .eq('room_id', room.id);
      if (error) return jsonError(error.message, 500);
      return jsonOk({ ok: true, moved: true, passed: true });
    }

    const playedTile = { ...orientTile(move.tile, move.side, payload.board), placedBy: turnSeat as Seat };
    const updatedBoard = move.side === 'left' ? [playedTile, ...payload.board] : [...payload.board, playedTile];
    const updatedHand = hand.filter((candidate) => candidate.id !== move.tile.id);
    const winnerSeat = updatedHand.length === 0 ? (turnSeat as Seat) : null;
    const upcomingSeat = winnerSeat ? null : nextSeat(turnSeat as Seat);

    const { error } = await supabase
      .from('game_state')
      .update({
        current_turn_seat: upcomingSeat,
        payload: {
          board: updatedBoard,
          handsBySeat: {
            ...payload.handsBySeat,
            [turnSeat]: updatedHand,
          },
          currentTurnSeat: upcomingSeat,
          winnerSeat,
        },
        phase: winnerSeat ? 'finished' : 'playing',
        status_text: winnerSeat ? `Ganó ${turnSeat}` : `CPU jugó ${move.tile.id}. Turno: ${upcomingSeat}`,
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', room.id);

    if (error) return jsonError(error.message, 500);
    return jsonOk({ ok: true, moved: true, passed: false });
  });
}
