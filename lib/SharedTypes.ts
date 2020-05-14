import { Player, Presenter } from '../server/Games/Game';

export interface IncomingCommand extends CommandBody {
  sourcePlayerId: string;
  type: PlayerCommandType;
}

export interface CommandBody {
  metadata: any;
}
export interface OutgoingPlayerCommand extends CommandBody {
  type: PlayerCommandType;
}

export interface OutgoingPresenterCommand extends CommandBody {
  type: PresenterCommandType;
}

export type PlayerCommandType = 'shirt' | 'design' | 'slogan' | 'vote' | 'score' | 'wait';
export type PresenterCommandType = 'all-players' | 'timer';

export type GameType = 'tko'; // More to follow.

export enum SOCKET_EVENTS {
  COMMAND = 'command',
  CLIENT_SOCKET_IDENTIFIER = 'client-socket-identifier',
}

export interface ClientSocketIdentifierProps {
  id: string;
}

export interface PlayerJoinResult {
  player: Player;
}

export interface CommandResult {
  command: OutgoingPlayerCommand;
}

export interface GameCreateResult {
  roomCode: string;
  presenter: Presenter;
}

export interface GameWatchResult {
  presenter: Presenter;
}
