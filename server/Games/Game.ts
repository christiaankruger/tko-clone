import { IncomingCommand, GameType, OutgoingPlayerCommand } from '../../lib/SharedTypes';
import { shortId } from './TKOMechanics';

export interface PlayerProps {
  // System Identifiers
  id: string;

  // Personal info
  name: string;
}

export interface PresenterProps {
  id: string;

  isCreator: boolean;
}

export class Player {
  id!: string;
  name!: string;

  static generateId(gameCode: string, name: string) {
    return shortId(`player-${gameCode}-${name}`);
  }

  static isPlayerId(id: string) {
    return /^player-/.test(id);
  }

  static gameCodeFromId(id: string) {
    if (!this.isPlayerId(id)) {
      throw new Error('Not a player id');
    }
    return id.split('-')[1];
  }

  constructor(properties: { id: string; name: string }) {
    Object.assign(this, properties);
  }
}

export class Presenter {
  id!: string;
  isCreator!: boolean;

  static generateId(gameCode: string) {
    return shortId(`presenter-${gameCode}`);
  }

  static isPresenterId(id: string) {
    return /^presenter-/.test(id);
  }

  static gameCodeFromId(id: string) {
    if (!this.isPresenterId(id)) {
      throw new Error('Not a player id');
    }
    return id.split('-')[1];
  }

  constructor(properties: { id: string; isCreator: boolean }) {
    Object.assign(this, properties);
  }
}

export interface IGame {
  gameCode: string;
  gameType: GameType;
  addPlayer: (name: string) => Player;
  addPresenter: (isCreator?: boolean) => Presenter;
  hasPlayerId: (id: string) => boolean;
  playerByName: (name: string) => Player | undefined;
  input: (command: IncomingCommand) => OutgoingPlayerCommand;
  orchestrate: () => Promise<void>;
}
