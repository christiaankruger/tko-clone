import { Player, Presenter } from '../server/Games/Game';
import { Shirt } from '../server/Games/TKOMechanics';

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
// Same same but all different (todo: find better names)
export type PresenterCommandType = 'all-players' | 'timer' | 'step' | 'pure-metadata';
export type PresenterCommandStep = 'round' | 'explain-and-wait' | 'announcement' | 'vs-vote';
export type PresenterCommandStepMetadata = Partial<{
  roundNumber: number;
  roundName: string;

  explainText: {
    heading: string;
    explainer: string;
    shirt?: Shirt;
  };
  explainStats: { player: Player; status: number | string }[];

  announcementHeading: string;
  announcementSubtext: string;

  vsVoteContenders: Shirt[];
}>;

export type StepPresenterCommandMetadata = {
  step: PresenterCommandStep;
  metadata: PresenterCommandStepMetadata;
};

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
