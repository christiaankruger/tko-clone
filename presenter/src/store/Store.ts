import { observable, action, computed, runInAction } from 'mobx';
import { IPromiseBasedObservable, fromPromise } from 'mobx-utils';
import { Post } from '../../../frontend-shared/util/API';
import {
  GameCreateResult,
  GameWatchResult,
  OutgoingPresenterCommand,
  PresenterCommandStep,
  StepPresenterCommandMetadata,
  PresenterCommandStepMetadata,
} from '../../../lib/SharedTypes';
import { Presenter, Player } from '../../../server/Games/Game';

export enum Pages {
  LANDING = 'landing',
  LOBBY = 'lobby',
  ROUND = 'round',
  EXPLAIN_AND_WAIT = 'explain-and-wait',
  ANNOUNCEMENT = 'announcement',
  VS_VOTE = 'vs-vote',
  SHOW_SCORES = 'show-scores',
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

  @observable
  metadata: PresenterCommandStepMetadata = {};

  @observable
  timer: number = 0;

  @action
  consumeCommand = (command: OutgoingPresenterCommand) => {
    console.log(`Consuming command`, command);

    if (command.type === 'all-players') {
      this.players = command.metadata.players.map((p: any) => new Player(p));
    }
    if (command.type === 'step') {
      // Special case, all screens are enclosed in 'step'
      const stepData = command.metadata as StepPresenterCommandMetadata;
      const step = stepData.step;
      if (step === 'announcement') {
        // Explicitly clear what we don't re-set. // Find better way to do this.
        const { announcementHeading, announcementSubtext, announcementShirt } = stepData.metadata;
        Object.assign(this.metadata, { announcementHeading, announcementSubtext, announcementShirt });
      } else {
        Object.assign(this.metadata, stepData.metadata);
      }

      if (step === 'round') {
        this.goToPage(Pages.ROUND);
      }
      if (step === 'explain-and-wait') {
        this.goToPage(Pages.EXPLAIN_AND_WAIT);
      }
      if (step === 'announcement') {
        this.goToPage(Pages.ANNOUNCEMENT);
      }
      if (step === 'vs-vote') {
        this.goToPage(Pages.VS_VOTE);
      }
      if (step === 'show-scores') {
        this.goToPage(Pages.SHOW_SCORES);
      }
    }
    if (command.type === 'pure-metadata') {
      Object.assign(this.metadata, command.metadata);
    }
    if (command.type === 'timer') {
      this.timer = command.metadata.time;
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
