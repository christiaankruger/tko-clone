import { observable, action, computed } from 'mobx';

export enum Pages {
  LOGIN = 'login',
  WAITING = 'waiting',
}

export interface PlayerDetails {
  name: string;
  id: string;
}

export class Store {
  @observable page: Pages = Pages.LOGIN;
  @observable playerDetails?: PlayerDetails;

  @action
  setPlayerDetails = (name: string, playerId: string) => {
    this.playerDetails = {
      name,
      id: playerId,
    };
  };

  @action
  goToPage = (page: Pages) => {
    this.page = page;
  };
}
