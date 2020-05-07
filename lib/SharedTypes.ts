export interface IncomingCommand extends CommandBody {
  sourcePlayerId: string;
}

export interface CommandBody {
  type: CommandType;
  metadata: any;
}
export interface OutgoingCommand extends CommandBody {}

export type CommandType = 'shirt' | 'design' | 'slogan' | 'vote' | 'score';

export type GameType = 'tko'; // More to follow.

export enum SOCKET_EVENTS {
  COMMAND = 'command',
  PLAYER_SOCKET_IDENTIFIER = 'player-socket-identifier',
}

export interface PlayerSocketIdentifierProps {
  playerId: string;
}
