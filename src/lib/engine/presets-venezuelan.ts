import type { Seat, TeamId, PlayerRef } from '@/lib/domain/contracts';
import { createDeck, nextSeat, orientTile, shuffleTiles } from '@/lib/domino/game';
import type { EngineTile, MatchState, RoundState } from '@/lib/engine/types';

export const TEAM_BY_SEAT: Record<Seat, TeamId> = {
  north: 'north-south',
  south: 'north-south',
  east: 'east-west',
  west: 'east-west',
};

export const SEAT_ORDER: Seat[] = ['north', 'east', 'south', 'west'];

export function createAuthoritativeMatch(roomId: string, targetScore = 100): MatchState {
  return {
    roomId,
    rulesPreset: 'venezuelan',
    status: 'lobby',
    roundNumber: 0,
    winnerTeam: null,
    lobby: {
      hostSeat: null,
      ready: {},
      players: {},
    },
    round: null,
    score: {
      targetScore,
      teams: {
        'north-south': 0,
        'east-west': 0,
      },
    },
  };
}

export function getTeamForSeat(seat: Seat): TeamId {
  return TEAM_BY_SEAT[seat];
}

export function areAllSeatsFilled(players: Partial<Record<Seat, PlayerRef>>) {
  return SEAT_ORDER.every((seat) => !!players[seat]);
}

export function areAllPlayersReady(players: Partial<Record<Seat, PlayerRef>>, ready: Partial<Record<Seat, boolean>>) {
  return SEAT_ORDER.every((seat) => !!players[seat] && ready[seat] === true);
}

export function dealAuthoritativeHands() {
  const deck = shuffleTiles(createDeck());
  return {
    north: deck.splice(0, 7),
    east: deck.splice(0, 7),
    south: deck.splice(0, 7),
    west: deck.splice(0, 7),
  };
}

export function findOpeningSeat(hands: Record<Seat, EngineTile[]>) {
  for (const seat of SEAT_ORDER) {
    if (hands[seat].some((tile) => tile.id === '6-6')) return seat;
  }

  return 'north' as const;
}

export function getOpenEnds(board: EngineTile[]) {
  if (board.length === 0) return { left: null, right: null };
  return { left: board[0].left, right: board[board.length - 1].right };
}

export function canPlayTileOnBoard(tile: EngineTile, side: 'left' | 'right', board: EngineTile[]) {
  if (board.length === 0) return tile.id === '6-6';
  const ends = getOpenEnds(board);
  const target = side === 'left' ? ends.left : ends.right;
  return target === tile.left || target === tile.right;
}

export function getLegalSides(tile: EngineTile, board: EngineTile[]) {
  return (['left', 'right'] as const).filter((side) => canPlayTileOnBoard(tile, side, board));
}

export function playerHasLegalMove(hand: EngineTile[], board: EngineTile[]) {
  return hand.some((tile) => getLegalSides(tile, board).length > 0);
}

export function applyTileToBoard(round: RoundState, seat: Seat, tile: EngineTile, side: 'left' | 'right'): RoundState {
  const placed = { ...orientTile(tile, side, round.board), playedBy: seat };
  const board = side === 'left' ? [placed, ...round.board] : [...round.board, placed];

  return {
    ...round,
    board,
    hands: {
      ...round.hands,
      [seat]: round.hands[seat].filter((entry) => entry.id !== tile.id),
    },
    currentTurn: nextSeat(seat),
    passesInRow: 0,
  };
}

export function sumPips(tiles: EngineTile[]) {
  return tiles.reduce((acc, tile) => acc + tile.left + tile.right, 0);
}

export function getRoundPoints(round: RoundState, winnerTeam: TeamId) {
  const losingTeam: TeamId = winnerTeam === 'north-south' ? 'east-west' : 'north-south';
  const losingSeats = SEAT_ORDER.filter((seat) => getTeamForSeat(seat) === losingTeam);
  return losingSeats.reduce((acc, seat) => acc + sumPips(round.hands[seat]), 0);
}

export function resolveBlockedWinner(round: RoundState): TeamId {
  const ns = sumPips(round.hands.north) + sumPips(round.hands.south);
  const ew = sumPips(round.hands.east) + sumPips(round.hands.west);
  return ns <= ew ? 'north-south' : 'east-west';
}
