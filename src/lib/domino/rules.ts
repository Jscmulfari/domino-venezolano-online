import type { DominoGameState, DominoTile } from '@/lib/domino/types';

export function canPlayTile(tile: DominoTile, side: 'left' | 'right', state: DominoGameState) {
  if (state.board.length === 0) return true;

  const target = side === 'left' ? state.leftOpen : state.rightOpen;
  if (target === null) return true;

  return tile.left === target || tile.right === target;
}

export function createEmptyGameState(roomId: string): DominoGameState {
  return {
    roomId,
    phase: 'waiting',
    currentTurnPlayerId: null,
    board: [],
    leftOpen: null,
    rightOpen: null,
    handCounts: {},
    moves: [],
    winnerTeam: null,
    updatedAt: new Date().toISOString(),
  };
}
