export type Seat = 'north' | 'east' | 'south' | 'west';

export type PlayerId = string;
export type Team = 'north-south' | 'east-west';

export type DominoTile = {
  id: string;
  left: number;
  right: number;
};

export type RoomVisibility = 'private';

export type Room = {
  id: string;
  code: string;
  name: string;
  visibility: RoomVisibility;
  maxPlayers: 4;
  createdAt: string;
};

export type RoomMember = {
  id: string;
  roomId: string;
  playerId: PlayerId;
  displayName: string;
  seat: Seat | null;
  online: boolean;
  joinedAt: string;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  authorId: PlayerId;
  authorName: string;
  body: string;
  createdAt: string;
};

export type DominoMove = {
  tileId: string;
  side: 'left' | 'right';
  byPlayerId: PlayerId;
  playedAt: string;
};

export type DominoGameState = {
  roomId: string;
  phase: 'waiting' | 'dealing' | 'playing' | 'finished';
  currentTurnPlayerId: PlayerId | null;
  board: DominoTile[];
  leftOpen: number | null;
  rightOpen: number | null;
  handCounts: Record<PlayerId, number>;
  moves: DominoMove[];
  winnerTeam: Team | null;
  updatedAt: string;
};

export type LiveRoomSnapshot = {
  room: {
    id: string;
    code: string;
    name: string;
    createdAt: string;
  };
  members: Array<{
    id: string;
    sessionId: string;
    displayName: string;
    seat: Seat | null;
    online: boolean;
    joinedAt: string;
    isBot: boolean;
  }>;
  messages: Array<{
    id: string;
    sessionId: string;
    authorName: string;
    body: string;
    createdAt: string;
  }>;
  game: {
    phase: 'waiting' | 'playing' | 'finished';
    currentTurnSeat: Seat | null;
    board: Array<{ id: string; left: number; right: number; placedBy: Seat }>;
    statusText: string;
    updatedAt: string;
    hand: Array<{ id: string; left: number; right: number }>;
    handCounts: Partial<Record<Seat, number>>;
    validSidesByTile: Record<string, Array<'left' | 'right'>>;
    winnerSeat: Seat | null;
  };
};
