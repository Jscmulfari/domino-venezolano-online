import type { Seat } from '@/lib/domino/types';
import { SEATS } from '@/lib/room/constants';

export type Tile = {
  id: string;
  left: number;
  right: number;
};

export type PlayedTile = Tile & {
  placedBy: Seat;
};

export type SeatHands = Partial<Record<Seat, Tile[]>>;

export type GamePayload = {
  board: PlayedTile[];
  currentTurnSeat: Seat | null;
  handsBySeat: SeatHands;
  winnerSeat: Seat | null;
};

export function createDeck() {
  const deck: Tile[] = [];

  for (let left = 0; left <= 6; left += 1) {
    for (let right = left; right <= 6; right += 1) {
      deck.push({ id: `${left}-${right}`, left, right });
    }
  }

  return deck;
}

export function shuffleTiles<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function dealHands() {
  const deck = shuffleTiles(createDeck());
  const handsBySeat: SeatHands = {};

  for (const seat of SEATS) {
    handsBySeat[seat] = deck.splice(0, 7).sort(sortTiles);
  }

  return handsBySeat;
}

export function sortTiles(a: Tile, b: Tile) {
  if (a.left === b.left) return a.right - b.right;
  return a.left - b.left;
}

export function getBoardEnds(board: Tile[]) {
  if (board.length === 0) {
    return { left: null, right: null };
  }

  return {
    left: board[0].left,
    right: board[board.length - 1].right,
  };
}

export function canPlayOnSide(tile: Tile, side: 'left' | 'right', board: Tile[]) {
  if (board.length === 0) return true;

  const ends = getBoardEnds(board);
  const target = side === 'left' ? ends.left : ends.right;
  return target === tile.left || target === tile.right;
}

export function orientTile(tile: Tile, side: 'left' | 'right', board: Tile[]): Tile {
  if (board.length === 0) return tile;

  const ends = getBoardEnds(board);
  const target = side === 'left' ? ends.left : ends.right;

  if (target === null) return tile;

  if (side === 'left') {
    if (tile.right === target) return tile;
    if (tile.left === target) return { ...tile, left: tile.right, right: tile.left };
  }

  if (tile.left === target) return tile;
  if (tile.right === target) return { ...tile, left: tile.right, right: tile.left };

  return tile;
}

export function nextSeat(current: Seat | null) {
  if (!current) return 'north' as const;
  const index = SEATS.indexOf(current);
  return SEATS[(index + 1) % SEATS.length];
}

export function normalizeGamePayload(raw: unknown): GamePayload {
  const fallback: GamePayload = {
    board: [],
    currentTurnSeat: null,
    handsBySeat: {},
    winnerSeat: null,
  };

  if (!raw || typeof raw !== 'object') return fallback;

  const candidate = raw as {
    board?: PlayedTile[];
    currentTurnSeat?: Seat | null;
    handsBySeat?: SeatHands;
    winnerSeat?: Seat | null;
  };

  return {
    board: Array.isArray(candidate.board) ? candidate.board : [],
    currentTurnSeat: candidate.currentTurnSeat ?? null,
    handsBySeat: candidate.handsBySeat && typeof candidate.handsBySeat === 'object' ? candidate.handsBySeat : {},
    winnerSeat: candidate.winnerSeat ?? null,
  };
}
