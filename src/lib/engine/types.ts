import type { Seat, TeamId, PlayerRef, ReadyMap } from '@/lib/domain/contracts';

export type EngineTile = {
  id: string;
  left: number;
  right: number;
};

export type ChainTile = EngineTile & {
  playedBy: Seat;
};

export type LobbyState = {
  hostSeat: Seat | null;
  ready: Partial<ReadyMap>;
  players: Partial<Record<Seat, PlayerRef>>;
};

export type RoundState = {
  board: ChainTile[];
  hands: Record<Seat, EngineTile[]>;
  currentTurn: Seat;
  opener: Seat;
  passesInRow: number;
  winnerSeat: Seat | null;
  closedByBlock: boolean;
};

export type ScoreState = {
  targetScore: number;
  teams: Record<TeamId, number>;
};

export type MatchState = {
  roomId: string;
  rulesPreset: 'venezuelan';
  status: 'lobby' | 'playing' | 'round-finished' | 'match-finished';
  lobby: LobbyState;
  roundNumber: number;
  round: RoundState | null;
  score: ScoreState;
  winnerTeam: TeamId | null;
};

export type EngineEvent =
  | { type: 'seat.claimed'; seat: Seat }
  | { type: 'ready.changed'; seat: Seat; ready: boolean }
  | { type: 'match.started'; roundNumber: number }
  | { type: 'turn.changed'; seat: Seat }
  | { type: 'tile.played'; seat: Seat; tileId: string; side: 'left' | 'right' }
  | { type: 'turn.passed'; seat: Seat }
  | { type: 'round.finished'; winnerTeam: TeamId; reason: 'domino' | 'block' }
  | { type: 'match.finished'; winnerTeam: TeamId };
