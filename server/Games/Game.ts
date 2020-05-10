import { IncomingCommand, GameType } from '../../lib/SharedTypes';

export interface Player {
  // System Identifiers
  id: string;

  // Personal info
  name: string;
}

export interface IGame {
  gameCode: string;
  gameType: GameType;
  addPlayer: (name: string) => Player;
  hasPlayerId: (id: string) => boolean;
  playerByName: (name: string) => Player | undefined;
  input: (command: IncomingCommand) => void;
  orchestrate: () => Promise<void>;
}
