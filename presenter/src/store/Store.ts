import { observable, action, computed, runInAction } from 'mobx';
import { IPromiseBasedObservable, fromPromise } from 'mobx-utils';
import { Post } from '../../../frontend-shared/util/API';
import { GameCreateResult, GameWatchResult, OutgoingPresenterCommand } from '../../../lib/SharedTypes';
import { Presenter, Player } from '../../../server/Games/Game';

export enum Pages {
  LANDING = 'landing',
  LOBBY = 'lobby',
}

export class Store {
  @observable
  currentPage: Pages = Pages.LANDING;

  @observable
  load?: IPromiseBasedObservable<any> = undefined;

  // Set when joining or creating:

  @observable
  gameCode!: string;

  @observable
  presenterDetails!: Presenter;

  @observable
  players: Player[] = [];

  @action
  consumeCommand = (command: OutgoingPresenterCommand) => {
    if (command.type === 'all-players') {
      this.players = command.metadata.players.map((p: any) => new Player(p));
    }
  };

  @action
  create = async (onSuccess: () => void) => {
    const createPromise = async () => {
      const response = await Post<GameCreateResult>('/create', {});
      runInAction(() => (this.gameCode = response.roomCode));
      runInAction(() => (this.presenterDetails = response.presenter));
      onSuccess();
      this.goToPage(Pages.LOBBY);
    };

    this.load = fromPromise(createPromise());
  };

  @action
  join = async (code: string, onSuccess: () => void) => {
    const joinPromise = async () => {
      const response = await Post<GameWatchResult>(`/${code}/watch`, {});
      runInAction(() => (this.gameCode = code));
      runInAction(() => (this.presenterDetails = new Presenter(response.presenter)));
      onSuccess();
      this.goToPage(Pages.LOBBY);
    };
    this.load = fromPromise(joinPromise());
  };

  @action
  goToPage = (page: Pages) => {
    this.currentPage = page;
  };
}
