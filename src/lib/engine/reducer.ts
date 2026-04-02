import type { Seat, PlayerRef } from '@/lib/domain/contracts';
import type { EngineEvent, MatchState } from '@/lib/engine/types';
import {
  applyTileToBoard,
  areAllPlayersReady,
  areAllSeatsFilled,
  canPlayTileOnBoard,
  createAuthoritativeMatch,
  dealAuthoritativeHands,
  findOpeningSeat,
  getLegalSides,
  getRoundPoints,
  getTeamForSeat,
  playerHasLegalMove,
  resolveBlockedWinner,
} from '@/lib/engine/presets-venezuelan';

export function createMatchState(roomId: string, targetScore = 100) {
  return createAuthoritativeMatch(roomId, targetScore);
}

export function claimSeat(state: MatchState, seat: Seat, player: PlayerRef) {
  const nextState: MatchState = {
    ...state,
    lobby: {
      ...state.lobby,
      hostSeat: state.lobby.hostSeat ?? seat,
      players: {
        ...state.lobby.players,
        [seat]: player,
      },
      ready: {
        ...state.lobby.ready,
        [seat]: false,
      },
    },
  };

  return { state: nextState, events: [{ type: 'seat.claimed', seat }] satisfies EngineEvent[] };
}

export function setReady(state: MatchState, seat: Seat, ready: boolean) {
  const nextState: MatchState = {
    ...state,
    lobby: {
      ...state.lobby,
      ready: {
        ...state.lobby.ready,
        [seat]: ready,
      },
    },
  };

  return { state: nextState, events: [{ type: 'ready.changed', seat, ready }] satisfies EngineEvent[] };
}

export function canStartMatch(state: MatchState) {
  return areAllSeatsFilled(state.lobby.players) && areAllPlayersReady(state.lobby.players, state.lobby.ready);
}

export function startMatch(state: MatchState) {
  if (!canStartMatch(state)) {
    throw new Error('Lobby incompleto o no listo');
  }

  const hands = dealAuthoritativeHands();
  const opener = findOpeningSeat(hands);

  const nextState: MatchState = {
    ...state,
    status: 'playing',
    roundNumber: state.roundNumber + 1,
    round: {
      board: [],
      hands,
      currentTurn: opener,
      opener,
      passesInRow: 0,
      winnerSeat: null,
      closedByBlock: false,
    },
  };

  return {
    state: nextState,
    events: [
      { type: 'match.started', roundNumber: nextState.roundNumber },
      { type: 'turn.changed', seat: opener },
    ] satisfies EngineEvent[],
  };
}

export function submitMove(state: MatchState, seat: Seat, tileId: string, side: 'left' | 'right') {
  if (state.status !== 'playing' || !state.round) throw new Error('No hay ronda activa');
  if (state.round.currentTurn !== seat) throw new Error('No es tu turno');

  const tile = state.round.hands[seat].find((entry) => entry.id === tileId);
  if (!tile) throw new Error('Ficha no encontrada en mano');
  if (!canPlayTileOnBoard(tile, side, state.round.board)) throw new Error('Jugada ilegal');

  let nextState: MatchState = {
    ...state,
    round: applyTileToBoard(state.round, seat, tile, side),
  };

  const events: EngineEvent[] = [{ type: 'tile.played', seat, tileId, side }];
  const nextRound = nextState.round;
  if (!nextRound) throw new Error('Ronda inválida');
  const updatedHand = nextRound.hands[seat];

  if (updatedHand.length === 0) {
    const winnerTeam = getTeamForSeat(seat);
    const points = getRoundPoints(nextRound, winnerTeam);
    nextState = finalizeRound(nextState, winnerTeam, 'domino', points, seat);
    events.push({ type: 'round.finished', winnerTeam, reason: 'domino' });
    if (nextState.status === 'match-finished') events.push({ type: 'match.finished', winnerTeam });
    return { state: nextState, events };
  }

  events.push({ type: 'turn.changed', seat: nextRound.currentTurn });
  return { state: nextState, events };
}

export function passTurn(state: MatchState, seat: Seat) {
  if (state.status !== 'playing' || !state.round) throw new Error('No hay ronda activa');
  if (state.round.currentTurn !== seat) throw new Error('No es tu turno');
  if (playerHasLegalMove(state.round.hands[seat], state.round.board)) throw new Error('No puedes pasar si tienes jugada');

  const nextTurn: Seat = state.round.currentTurn === 'north' ? 'east' : state.round.currentTurn === 'east' ? 'south' : state.round.currentTurn === 'south' ? 'west' : 'north';
  const updatedRound = {
    ...state.round,
    currentTurn: nextTurn,
    passesInRow: state.round.passesInRow + 1,
  };

  let nextState: MatchState = { ...state, round: updatedRound };
  const events: EngineEvent[] = [{ type: 'turn.passed', seat }];

  if (updatedRound.passesInRow >= 4) {
    const winnerTeam = resolveBlockedWinner(updatedRound);
    const points = getRoundPoints(updatedRound, winnerTeam);
    nextState = finalizeRound(nextState, winnerTeam, 'block', points, null);
    events.push({ type: 'round.finished', winnerTeam, reason: 'block' });
    if (nextState.status === 'match-finished') events.push({ type: 'match.finished', winnerTeam });
    return { state: nextState, events };
  }

  events.push({ type: 'turn.changed', seat: nextTurn });
  return { state: nextState, events };
}

function finalizeRound(state: MatchState, winnerTeam: ReturnType<typeof getTeamForSeat>, reason: 'domino' | 'block', points: number, winnerSeat: Seat | null): MatchState {
  const nextScore = state.score.teams[winnerTeam] + points;
  const matchFinished = nextScore >= state.score.targetScore;

  return {
    ...state,
    status: matchFinished ? 'match-finished' : 'round-finished',
    winnerTeam: matchFinished ? winnerTeam : null,
    score: {
      ...state.score,
      teams: {
        ...state.score.teams,
        [winnerTeam]: nextScore,
      },
    },
    round: state.round
      ? {
          ...state.round,
          winnerSeat,
          closedByBlock: reason === 'block',
        }
      : null,
  };
}

export function getPlayerLegalMoves(state: MatchState, seat: Seat) {
  if (!state.round) return [];
  return state.round.hands[seat].flatMap((tile) => getLegalSides(tile, state.round!.board).map((side) => ({ tileId: tile.id, side })));
}
