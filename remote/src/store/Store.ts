import { observable, action, computed } from 'mobx';
import { OutgoingPlayerCommand } from '../../../lib/SharedTypes';

export enum Pages {
  LOGIN = 'login',
  WAITING = 'waiting',
  DRAW = 'draw',
  WRITE = 'write',
  COMPOSE = 'compose',
  SCORE = 'score',
  VOTE = 'vote',
}

export interface GameDetails {
  playerName: string;
  playerId: string;
  gameCode: string;
}

export class Store {
  @observable page: Pages = Pages.LOGIN;
  @observable gameDetails?: GameDetails;
  @observable metadata: any = {};

  @action
  setGameDetails = (details: GameDetails) => {
    this.gameDetails = details;
  };

  @action
  goToPage = (page: Pages) => {
    this.page = page;
  };

  @computed get commandUrl() {
    if (!this.gameDetails) {
      throw new Error('Game details not initialized');
    }
    return `/${this.gameDetails.gameCode}/command`;
  }

  @action
  consumeCommand(command: OutgoingPlayerCommand) {
    this.metadata = command.metadata;

    if (command.type === 'design') {
      this.goToPage(Pages.DRAW);
    }
    if (command.type === 'wait') {
      this.goToPage(Pages.WAITING);
    }
    if (command.type === 'write') {
      this.goToPage(Pages.WRITE);
    }
    if (command.type === 'shirt') {
      this.goToPage(Pages.COMPOSE);
    }
    if (command.type === 'score') {
      this.goToPage(Pages.SCORE);
    }
    if (command.type === 'vote') {
      this.goToPage(Pages.VOTE);
    }
  }
}
