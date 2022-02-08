import { IGame, Player, Presenter } from './Game';
import { generateRoomCode } from '../util';
import { shortId, Shirt } from './TKOMechanics';
import {
  IncomingCommand,
  OutgoingPlayerCommand,
  GameType,
  OutgoingPresenterCommand,
  PresenterCommandStep,
  PresenterCommandStepMetadata,
} from '../../lib/SharedTypes';

export type OnCommunicateType = (playerId: string, payload: OutgoingPlayerCommand | OutgoingPresenterCommand) => void;
export interface BaseGameProps {
  onCommunicate: OnCommunicateType;
}

export type SessionFnType = (
  player: Player,
  response: IncomingCommand,
  allResponses: IncomingCommand[]
) => OutgoingPlayerCommand;

export interface Session {
  id: string;
  active: boolean;
  fn: SessionFnType;
  targetIds: string[];
  responses: IncomingCommand[];
}

const DEFAULT_WAITING_TIME = 90; // seconds
export const waitFor = async (second: number) => {
  await new Promise((resolve) => setTimeout(resolve, second * 1000));
};

export class BaseGame {
  gameCode: string = generateRoomCode();
  players: Player[] = [];
  presenters: Presenter[] = [];
  gameType: GameType;
  private sessions: Session[] = [];
  explainAndWaitUpdater?: () => { player: Player; status: number | string }[];

  constructor(public props: BaseGameProps) {}

  addPlayer(name: string): Player {
    const player = new Player({ id: shortId(`player-${this.gameCode}`), name });
    this.players.push(player);
    this.sendToAllPresenters({
      type: 'all-players',
      metadata: {
        players: this.players,
      },
    });
    return player;
  }

  addPresenter(isCreator: boolean = false): Presenter {
    const presenter = new Presenter({ id: shortId(`presenter-${this.gameCode}`), isCreator });
    this.presenters.push(presenter);
    return presenter;
  }

  playerByName(name: string): Player | undefined {
    return this.players.find((p) => p.name === name);
  }

  hasPlayerId(id: string): boolean {
    return this.players.some((p) => p.id === id);
  }

  input(command: IncomingCommand): OutgoingPlayerCommand {
    const activeSession = this.sessions.find((s) => s.active && s.targetIds.includes(command.sourcePlayerId));
    if (!activeSession) {
      console.log(`Warning: no active session found for ${JSON.stringify(command)}`);
      return {
        type: 'no-op',
        metadata: {},
      };
    }
    const player = this.players.find((p) => p.id === command.sourcePlayerId)!;
    activeSession.responses.push(command);
    const response = activeSession.fn(player, command, activeSession.responses);
    this.updateExplainAndWait();
    return response;
  }

  async orchestrate(): Promise<void> {
    throw new Error(`Implement me`);
  }

  announceRound = async (roundNumber: number, roundName: string) => {
    this.sendStepToAllPresenters('round', {
      roundNumber,
      roundName,
    });
    await waitFor(3);
  };

  makeAnnouncement = async (options: { heading: string; subtext?: string; shirt?: Shirt }, pauseFor?: number) => {
    this.sendStepToAllPresenters('announcement', {
      announcementHeading: options.heading,
      announcementSubtext: options.subtext || '',
      announcementShirt: options.shirt || undefined,
    });
    if (pauseFor) {
      await waitFor(pauseFor);
    }
  };

  handleInput(command: IncomingCommand): OutgoingPlayerCommand {
    throw new Error(`Implementation class should implement me pls`);
  }

  requestInput(
    who: () => Player[] | 'all',
    command: (player: Player) => OutgoingPlayerCommand,
    fn: SessionFnType
  ): (() => boolean)[] {
    const sessionId = shortId('session');

    const evalWho = who();
    const targets = evalWho === 'all' ? this.players : evalWho;

    const session: Session = {
      id: sessionId,
      targetIds: targets.map((t) => t.id),
      active: true,
      fn,
      responses: [],
    };

    const endWith = () => (session.active = false);
    const hasEnded = () => session.active === false;
    this.sessions.push(session);

    targets.forEach((t) => {
      const cmd = command(t);
      this.sendToPlayer(t.id, cmd);
    });

    return [endWith, hasEnded];
  }

  explainAndWait = (
    // Find a way to remove 'Shirt' here.
    options: { heading: string; explainer: string; shirt?: Shirt },
    explainAndWaitUpdater: () => { player: Player; status: number | string }[]
  ) => {
    const { heading, explainer, shirt = undefined } = options;
    this.explainAndWaitUpdater = explainAndWaitUpdater;
    this.sendStepToAllPresenters('explain-and-wait', {
      explainText: {
        heading,
        explainer,
        shirt,
      },
      explainStats: [],
    });
    this.updateExplainAndWait();
  };

  emitTimer(time: number) {
    this.sendToAllPresenters({
      type: 'timer',
      metadata: {
        time,
      },
    });
  }

  defaultTurnTimer = async (hasEnded: () => boolean, end: () => boolean, time = DEFAULT_WAITING_TIME) => {
    for (let i = 0; i < time; i++) {
      this.emitTimer(time - i);
      await waitFor(1);
      if (hasEnded()) {
        return;
      }
    }
    end();
  };

  private updateExplainAndWait = () => {
    if (!this.explainAndWaitUpdater) {
      return;
    }

    this.sendToAllPresenters({
      type: 'pure-metadata',
      metadata: {
        explainStats: this.explainAndWaitUpdater(),
      },
    });
  };

  sendToPlayer(playerId: string, payload: OutgoingPlayerCommand) {
    this.props.onCommunicate(playerId, payload);
  }

  sendToAllPlayers(payload: OutgoingPlayerCommand) {
    console.log(`[${this.gameCode}] Sending to all players: ${JSON.stringify(payload)}`);
    this.players.forEach(({ id }) => {
      this.props.onCommunicate(id, payload);
    });
  }

  sendStepToAllPresenters(step: PresenterCommandStep, metadata: PresenterCommandStepMetadata) {
    this.sendToAllPresenters({
      type: 'step',
      metadata: {
        step,
        metadata,
      },
    });
  }

  sendToAllPresenters(payload: OutgoingPresenterCommand) {
    console.log(`[${this.gameCode}] Sending to all presenters: ${JSON.stringify(payload)}`);
    this.presenters.forEach(({ id }) => {
      this.props.onCommunicate(id, payload);
    });
  }
}
