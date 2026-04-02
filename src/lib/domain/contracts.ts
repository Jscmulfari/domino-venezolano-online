export type Seat = 'north' | 'east' | 'south' | 'west';
export type TeamId = 'north-south' | 'east-west';

export type PlayerRef = {
  playerId: string;
  sessionId: string;
  displayName: string;
  seat: Seat;
  teamId: TeamId;
  isBot: boolean;
};

export type RoomContract = {
  roomId: string;
  code: string;
  hostPlayerId: string;
  maxPlayers: 4;
  rulesPreset: 'venezuelan';
};

export type ReadyMap = Record<Seat, boolean>;

export type MatchContract = {
  matchId: string;
  roomId: string;
  status: 'lobby' | 'playing' | 'round-finished' | 'match-finished';
  roundNumber: number;
  targetScore: number;
};
