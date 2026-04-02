import type { LiveRoomSnapshot, Seat } from '@/lib/domino/types';
import { canPlayOnSide, normalizeGamePayload } from '@/lib/domino/game';
import { SEATS } from '@/lib/room/constants';
import { createServerSupabase } from '@/lib/supabase/server';

function normalizeSeat(value: string | null): Seat | null {
  if (!value) return null;
  return SEATS.includes(value as Seat) ? (value as Seat) : null;
}

export async function getRoomSnapshot(roomCode: string, sessionId?: string | null): Promise<LiveRoomSnapshot> {
  const supabase = createServerSupabase();

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, code, name, created_at')
    .eq('code', roomCode.toUpperCase())
    .maybeSingle();

  if (roomError) throw roomError;
  if (!room) throw new Error('Sala no encontrada');

  const [{ data: members, error: membersError }, { data: messages, error: messagesError }, { data: game, error: gameError }] = await Promise.all([
    supabase.from('room_members').select('id, session_id, display_name, seat, online, joined_at').eq('room_id', room.id).order('joined_at'),
    supabase.from('chat_messages').select('id, session_id, author_name, body, created_at').eq('room_id', room.id).order('created_at'),
    supabase.from('game_state').select('phase, current_turn_seat, board, status_text, updated_at, payload').eq('room_id', room.id).maybeSingle(),
  ]);

  if (membersError) throw membersError;
  if (messagesError) throw messagesError;
  if (gameError) throw gameError;

  const normalizedMembers = (members ?? []).map((member) => ({
    id: member.id,
    sessionId: member.session_id,
    displayName: member.display_name,
    seat: normalizeSeat(member.seat),
    online: member.online,
    joinedAt: member.joined_at,
  }));

  const payload = normalizeGamePayload(game?.payload);
  const viewerSeat = normalizedMembers.find((member) => member.sessionId === sessionId)?.seat ?? null;
  const viewerHand = viewerSeat ? payload.handsBySeat[viewerSeat] ?? [] : [];
  const handCounts = Object.fromEntries(SEATS.map((seat) => [seat, payload.handsBySeat[seat]?.length ?? 0])) as Partial<Record<Seat, number>>;
  const validSidesByTile = Object.fromEntries(
    viewerHand.map((tile) => {
      const sides = (['left', 'right'] as const).filter((side) => canPlayOnSide(tile, side, payload.board));
      return [tile.id, sides];
    }),
  ) as Record<string, Array<'left' | 'right'>>;

  return {
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      createdAt: room.created_at,
    },
    members: normalizedMembers,
    messages: (messages ?? []).map((message) => ({
      id: message.id,
      sessionId: message.session_id,
      authorName: message.author_name,
      body: message.body,
      createdAt: message.created_at,
    })),
    game: {
      phase: game?.phase === 'playing' || game?.phase === 'finished' ? game.phase : 'waiting',
      currentTurnSeat: normalizeSeat(game?.current_turn_seat ?? payload.currentTurnSeat ?? null),
      board: payload.board,
      statusText: game?.status_text ?? 'Esperando 4 jugadores',
      updatedAt: game?.updated_at ?? room.created_at,
      hand: viewerHand,
      handCounts,
      validSidesByTile,
      winnerSeat: payload.winnerSeat,
    },
  };
}
