import { v4 } from 'uuid';
import {
  IncomingCommand,
  OutgoingPlayerCommand,
  SOCKET_EVENTS,
  GameType,
  OutgoingPresenterCommand,
  PresenterCommandStep,
  PresenterCommandStepMetadata,
  PresenterCommandType,
  VSVoteResult,
  ScoreInfo,
} from '../../lib/SharedTypes';
import socketIo from 'socket.io';
import { Player, IGame, Presenter } from './Game';
import { Design, Slogan, Round, Shirt, ShirtScore, AdhocScore, shortId, Vote } from './TKOMechanics';
import { generateRoomCode, shuffle, sample } from '../util';
import { take, pipe, compose, filter, last } from 'ramda';

export interface TKOProps {
  onCommunicate: OnCommunicateType;
}

export type OnCommunicateType = (playerId: string, payload: OutgoingPlayerCommand | OutgoingPresenterCommand) => void;

export enum ADHOC_REASON {
  DESIGN = 'design',
  SLOGAN = 'slogan',
  VOTE = 'vote',
}

type ScoreAndVoteCeremoniesOptions = {
  possibleScores: number[];
};

export class TKO implements IGame {
  gameCode: string = generateRoomCode();

  players: Player[] = [];
  presenters: Presenter[] = [];
  designs: Design[] = [];
  slogans: Slogan[] = [];
  previousRounds: Round[] = [];

  currentRound: Round = new Round();
  gameType: GameType = 'tko';

  designAndAssetBonusesEnabled: boolean = true;
  repeatCollectSlogan: boolean = true;

  explainAndWaitUpdater?: () => { player: Player; status: number | string }[];

  constructor(private options: TKOProps) {}

  addPlayer(name: string): Player {
    const player = new Player({
      id: Player.generateId(this.gameCode, name),
      name,
    });

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
    const presenter = new Presenter({
      id: Presenter.generateId(this.gameCode),
      isCreator,
    });
    this.presenters.push(presenter);
    return presenter;
  }

  hasPlayerId(playerId: string): boolean {
    return !!this.players.find((p) => p.id === playerId);
  }

  playerByName(name: string): Player | undefined {
    return this.players.find((p) => p.name === name);
  }

  async orchestrate() {
    // Round 1
    const ROUND_1_DESIGNS = 2;
    await this.announceRound(1, 'The Drawening');
    this.explainAndWait(
      {
        heading: "Let's draw some shirts!",
        explainer: `Draw a total of ${ROUND_1_DESIGNS} shirts! ${sample(
          inspirations
        )} You'll get bonus points if your design gets used on someone else's shirt.`,
      },
      () => {
        // Compute new
        return this.players.map((player) => {
          const count = this.designs.filter((d) => d.createdBy === player.id).length;
          return {
            player,
            status: count,
          };
        });
      }
    );
    for (let i = 0; i < ROUND_1_DESIGNS; i++) {
      await this.collectDesigns();
    }
    this.explainAndWait(
      {
        heading: "Let's get writing!",
        explainer: `Write as many slogans as you can! ${sample(
          inspirations
        )} You'll get bonus points if your slogan gets used on someone else's shirt.`,
      },
      () => {
        // Compute new
        return this.players.map((player) => {
          const count = this.slogans.filter((d) => d.createdBy === player.id).length;
          return {
            player,
            status: count,
          };
        });
      }
    );
    await this.collectSlogans();

    this.explainAndWait(
      {
        heading: "We've got a shirt to build",
        explainer: `Build a beautiful shirt! Be funny, witty or straight up weird.`,
      },
      () => {
        // Compute new
        return this.players.map((player) => {
          const count = this.currentRound.shirts.filter((s) => s.createdBy === player.id).length;
          return {
            player,
            status: count,
          };
        });
      }
    );
    await this.collectShirts(this.designs, this.slogans);

    await this.scoreAndVoteCeremonies({
      possibleScores: [100, 200, 300, 400, 500],
    });

    // Round 2
    this.newRound();
    await this.announceRound(2, 'Levelling up');
    this.designAndAssetBonusesEnabled = false; // No adhoc bonus scores for this round

    await this.makeAnnouncement(
      {
        heading: 'Give us a design!',
        subtext: "We'll pick a random one, and everyone has to provide a slogan for it.",
      },
      5
    );

    this.explainAndWait(
      {
        heading: "Let's draw some shirts!",
        explainer: `Draw another shirt! ${sample(
          inspirations
        )} We'll pick a random one, and everyone has to provide a slogan for it.`,
      },
      () => {
        // Compute new
        return this.players.map((player) => {
          const count = this.designs.filter((d) => d.createdBy === player.id).length;
          return {
            player,
            status: count,
          };
        });
      }
    );

    await this.collectDesigns();
    const luckyDesign = sample(this.designs);
    const luckyShirt = new Shirt({
      createdBy: 'SYSTEM',
      design: luckyDesign,
      slogan: {
        createdBy: 'SYSTEM',
        id: 'SYSTEM',
        text: 'Your slogan here',
      },
    });

    this.explainAndWait(
      {
        heading: 'Write a slogan for this shirt',
        explainer: 'Outwit your opponents, you can do it!',
        shirt: luckyShirt,
      },
      () => {
        return this.players.map((player) => {
          const count = this.slogans.filter((d) => d.createdBy === player.id).length;
          return {
            player,
            status: count,
          };
        });
      }
    );
    this.repeatCollectSlogan = false;
    await this.collectSlogans(this.players.length);

    // Make shirts for these people (only for those who submitted slogans)
    this.currentRound.shirts = this.slogans.map((slogan) => {
      return new Shirt({
        createdBy: slogan.createdBy,
        slogan,
        design: luckyDesign,
      });
    });

    await this.scoreAndVoteCeremonies({
      possibleScores: [200, 400, 600, 800, 1000],
    });
  }

  private newRound() {
    this.previousRounds.push(this.currentRound);
    this.currentRound = new Round();
    this.designs = [];
    this.slogans = [];

    // Defaults
    this.designAndAssetBonusesEnabled = true;
    this.repeatCollectSlogan = true;
  }

  private scoreAndVoteCeremonies = async (options: ScoreAndVoteCeremoniesOptions) => {
    await this.makeAnnouncement(
      {
        heading: 'Time to award some points',
        subtext:
          'Assign every shirt a score between 100 and 500. The top two shirts will proceed to the final votedown.',
      },
      5
    );

    // In case someone keeps a keen eye
    this.currentRound.shirts = shuffle(this.currentRound.shirts);

    for (let i = 0; i < this.currentRound.shirts.length; i++) {
      this.sendToAllPlayers({ type: 'wait', metadata: {} });
      const shirt = this.currentRound.shirts[i];

      this.explainAndWait(
        {
          heading: 'Whatcha think?',
          explainer: 'How do you rate this shirt?',
          shirt,
        },
        () => {
          // DONT tally up votes here, it leaks info about whose shirt it is.
          return this.players.map((player) => {
            return {
              player,
              status: '?',
            };
          });
        }
      );

      await this.collectScoresFor(shirt, options.possibleScores);
    }

    const allScores = this.currentRound.shirts
      .map((shirt) => {
        const score = this.currentRound.shirtScores
          .filter((s) => s.shirt.id === shirt.id)
          .map((shirtScore) => shirtScore.value)
          .reduce((memo, x) => memo + x, 0);
        return { shirt, score };
      })
      .sort((a, b) => b.score - a.score);

    await this.makeAnnouncement(
      {
        heading: 'The scores are in!',
        subtext: 'But first, a few honorable mentions',
      },
      5
    );

    // Loser announcement
    for (let j = allScores.length - 1; j >= 2; j--) {
      const details = allScores[j];
      const playerName = this.players.find((p) => p.id === details.shirt.createdBy)!.name;

      await this.makeAnnouncement(
        {
          heading: `${j + 1}: ${playerName} (+ ${details.score})`,
          shirt: details.shirt,
        },
        8
      );
    }

    const topTwo = shuffle(take(2)(allScores));
    console.log(
      `[${this.gameCode}]: Voting happens between: ${JSON.stringify(
        topTwo.map((t) => ({ shirtId: t.shirt.id, score: t.score }))
      )}`
    );

    this.sendToAllPlayers({ type: 'wait', metadata: {} });
    await this.makeAnnouncement(
      {
        heading: "It's the final votedown!",
        subtext: 'Your top two are ready. May the best shirt win.',
      },
      5
    );

    this.sendStepToAllPresenters('vs-vote', {
      vsVoteContenders: topTwo.map((t) => t.shirt),
    });
    await this.collectVotesBetween(topTwo.map((t) => t.shirt));

    // Broadcast voting result
    await this.computeAndBroadcastVotingResult();
    await waitFor(5);

    await this.makeAnnouncement({ heading: 'Time for some scores!' }, 3);
    const shirtScores = this.players.map((p) => {
      const value = this.currentRound.shirtScores
        .filter((s) => s.shirt.createdBy === p.id)
        .reduce((memo, x) => memo + x.value, 0);
      return {
        name: p.name,
        value,
      } as ScoreInfo;
    });
    await this.showScores('Shirt scores', shirtScores);

    if (this.designAndAssetBonusesEnabled) {
      const sloganScores = this.players.map((p) => {
        const value = this.currentRound.adhocScores
          .filter((s) => s.reason === ADHOC_REASON.SLOGAN && s.targetId === p.id)
          .reduce((memo, x) => memo + x.value, 0);
        return {
          name: p.name,
          value,
        } as ScoreInfo;
      });
      await this.showScores('Slogan bonuses', sloganScores);
      const designScores = this.players.map((p) => {
        const value = this.currentRound.adhocScores
          .filter((s) => s.reason === ADHOC_REASON.DESIGN && s.targetId === p.id)
          .reduce((memo, x) => memo + x.value, 0);
        return {
          name: p.name,
          value,
        } as ScoreInfo;
      });
      await this.showScores('Design bonuses', designScores);
    }

    this.computeFinalScoresForRound();
    await this.makeAnnouncement({ heading: 'Drum roll, please...' }, 3);
    await this.showScores(
      'End of round',
      this.currentRound.finalScores.map((s) => {
        return {
          name: s.player.name,
          value: s.score,
        };
      })
    );
  };

  private computeFinalScoresForRound() {
    const round = this.currentRound;
    const finalScores = this.players.map((p) => {
      const shirts = sumOfScores(round.shirtScores.filter((s) => s.shirt.createdBy === p.id));
      const adhoc = sumOfScores(round.adhocScores.filter((s) => s.targetId === p.id));
      return {
        player: p,
        score: shirts + adhoc,
      };
    });
    round.finalScores = finalScores;
  }

  private computeAndBroadcastVotingResult = async () => {
    const votingRound = last(this.currentRound.votingRounds)!;
    const voteValue = Math.floor(1_000 / votingRound.length);

    // Convert to scores:
    votingRound.forEach((vote) => {
      this.currentRound.adhocScores.push({
        scorerId: vote.scorerId,
        targetId: vote.voteFor.createdBy,
        id: shortId('adhoc'),
        reason: ADHOC_REASON.VOTE,
        value: voteValue,
      });
    });

    const running: VSVoteResult[] = [];
    for (let i = 0; i < votingRound.length; i++) {
      const vote = votingRound[i];
      running.push({
        voterName: this.players.find((p) => p.id === vote.scorerId)!.name,
        scoreValue: voteValue,
        forShirtId: vote.voteFor.id,
      });
      this.sendToAllPresenters({
        type: 'pure-metadata',
        metadata: {
          vsVoteVotes: running,
        },
      });
      await waitFor(0.5);
    }
  };

  private makeAnnouncement = async (
    options: { heading: string; subtext?: string; shirt?: Shirt },
    pauseFor?: number
  ) => {
    this.sendStepToAllPresenters('announcement', {
      announcementHeading: options.heading,
      announcementSubtext: options.subtext || '',
      announcementShirt: options.shirt || undefined,
    });
    if (pauseFor) {
      await waitFor(pauseFor);
    }
  };

  private explainAndWait = (
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

  private emitTimer(time: number) {
    this.sendToAllPresenters({
      type: 'timer',
      metadata: {
        time,
      },
    });
  }

  private async showScores(category: string, scores: ScoreInfo[]) {
    this.sendStepToAllPresenters('show-scores', {
      showScoresScores: scores,
      showScoresCategory: category,
    });
    await waitFor(10);
  }

  private async collectVotesBetween(shirts: Shirt[]) {
    this.currentRound.votingRounds.push([]);

    // Everyone whose shirt is up for voting doesn't get to vote.
    const playerIdsOfShirts = shirts.map((s) => s.createdBy);
    const votingPlayers = this.players.filter(({ id }) => !playerIdsOfShirts.includes(id));

    // 0 since we initialized to an empty array up ^
    const targetVotes = 0 + votingPlayers.length;
    votingPlayers.forEach(({ id }) => {
      this.options.onCommunicate(id, {
        type: 'vote',
        metadata: {
          between: shirts.map((s) => ({ description: s.slogan.text, id: s.id })),
        },
      });
    });

    for (let i = 1; i <= 45; i++) {
      this.emitTimer(45 - i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (last(this.currentRound.votingRounds)!.length === targetVotes) {
        return;
      }
    }
  }

  private async collectScoresFor(shirt: Shirt, possibleScores: number[]) {
    const scoringPlayers = this.players.filter((p) => p.id !== shirt.createdBy);

    scoringPlayers.forEach((p) => {
      this.options.onCommunicate(p.id, {
        type: 'score',
        metadata: {
          description: shirt.slogan.text,
          shirtId: shirt.id,
          possibleScores,
        },
      });
    });

    // Everyone except the artist gets to score
    const targetScoreCount = this.currentRound.shirtScores.length + scoringPlayers.length;

    for (let i = 1; i <= 45; i++) {
      this.emitTimer(45 - i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (this.currentRound.shirtScores.length === targetScoreCount) {
        return;
      }
    }
  }

  private async collectDesigns() {
    const targetDesignCount = this.designs.length + this.players.length;
    this.sendToAllPlayers({
      type: 'design',
      metadata: {},
    });
    for (let i = 1; i <= 45; i++) {
      this.emitTimer(45 - i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // TODO: Emit timer to presenter
      if (this.designs.length === targetDesignCount) {
        return;
      }
    }
  }

  private async collectSlogans(targetSloganCount: number = Infinity) {
    this.sendToAllPlayers({
      type: 'slogan',
      metadata: {},
    });
    for (let i = 1; i <= 45; i++) {
      this.emitTimer(45 - i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // TODO: Emit timer to presenter
      if (this.slogans.length === targetSloganCount) {
        return;
      }
    }
  }

  private async collectShirts(designs: Design[], slogans: Slogan[]) {
    const used: { [id: string]: boolean } = {};
    const takeDesigns = take(designs.length / this.players.length);
    const takeSlogans = take(slogans.length / this.players.length);

    this.players.forEach(({ id }) => {
      const designsForMe = takeDesigns(
        shuffle(designs)
          .filter((v) => v.createdBy !== id)
          .filter((v) => !used[v.id])
      );
      const slogansForMe = takeSlogans(
        shuffle(slogans)
          .filter((v) => v.createdBy !== id)
          .filter((v) => !used[v.id])
      );
      [...designsForMe, ...slogansForMe].forEach((v) => (used[v.id] = true));
      console.log(`[collectShirts] Sending to player '${id}'...`);
      console.log(`... designs: ${designsForMe.map((d) => d.id)}`);
      console.log(`... slogans: ${slogansForMe.map((d) => d.id)}`);

      this.options.onCommunicate(id, {
        type: 'shirt',
        metadata: {
          designs: designsForMe,
          slogans: slogansForMe,
        },
      });
    });

    const targetShirts = this.currentRound.shirts.length + this.players.length;
    for (let i = 1; i <= 45; i++) {
      this.emitTimer(45 - i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // TODO: Emit timer to presenter
      if (this.currentRound.shirts.length === targetShirts) {
        return;
      }
    }
  }

  private announceRound = async (roundNumber: number, roundName: string) => {
    this.sendStepToAllPresenters('round', {
      roundNumber,
      roundName,
    });
    await waitFor(3);
  };

  input(command: IncomingCommand): OutgoingPlayerCommand {
    console.log(`[${this.gameCode}]: Received command: ${JSON.stringify(command)}`);
    if (command.type === 'design') {
      const design = new Design({
        createdBy: command.sourcePlayerId,
        base64: command.metadata.base64,
      });
      console.log(`Created design: ${JSON.stringify(design, null, 2)}`);
      this.designs.push(design);
      this.updateExplainAndWait();
      return {
        type: 'wait',
        metadata: {},
      };
    }
    if (command.type === 'slogan') {
      const slogan = new Slogan({
        createdBy: command.sourcePlayerId,
        text: command.metadata.text,
      });
      console.log(`Created slogan: ${JSON.stringify(slogan, null, 2)}`);
      this.slogans.push(slogan);
      this.updateExplainAndWait();
      if (this.repeatCollectSlogan) {
        return {
          type: 'slogan',
          metadata: {},
        };
      } else {
        return {
          type: 'wait',
          metadata: {},
        };
      }
    }
    if (command.type === 'shirt') {
      const { designId, sloganId } = command.metadata;
      const shirt = new Shirt({
        createdBy: command.sourcePlayerId,
        design: this.designs.find((d) => d.id === designId)!,
        slogan: this.slogans.find((s) => s.id === sloganId)!,
      });
      console.log(`Received shirt with design: '${designId}' and slogan '${sloganId}'.`);
      this.currentRound.shirts.push(shirt);
      this.updateExplainAndWait();
      return {
        type: 'wait',
        metadata: {},
      };
    }
    if (command.type === 'score') {
      const { shirtId, value } = command.metadata;
      const shirt = this.currentRound.shirts.find((s) => s.id === shirtId)!;
      // Register shirt score
      const shirtScore = new ShirtScore({
        scorerId: command.sourcePlayerId,
        shirt,
        value,
      });
      // Register adhoc score
      if (this.designAndAssetBonusesEnabled) {
        const designScore = new AdhocScore({
          scorerId: command.sourcePlayerId,
          targetId: shirt.design.createdBy,
          value: value / 2,
          reason: ADHOC_REASON.DESIGN,
        });
        const sloganScore = new AdhocScore({
          scorerId: command.sourcePlayerId,
          targetId: shirt.slogan.createdBy,
          value: value / 2,
          reason: ADHOC_REASON.SLOGAN,
        });

        console.log(`Registered a design score of '${designScore.value}' for '${designScore.targetId}.`);
        console.log(`Registered a slogan score of '${sloganScore.value}' for '${sloganScore.targetId}.`);
        this.currentRound.adhocScores.push(designScore);
        this.currentRound.adhocScores.push(sloganScore);
      }

      console.log(`Registered a shirt score of '${shirtScore.value}' for '${shirtScore.shirt.createdBy}.`);

      this.currentRound.shirtScores.push(shirtScore);

      this.updateExplainAndWait();

      return {
        type: 'wait',
        metadata: {},
      };
    }
    if (command.type === 'vote') {
      const { targetId } = command.metadata;
      const vote = new Vote({
        scorerId: command.sourcePlayerId,
        voteFor: this.currentRound.shirts.find((s) => s.id === targetId)!,
      });
      console.log(`Player '${vote.scorerId}' voted for '${vote.voteFor.id}'.`);
      last(this.currentRound.votingRounds)!.push(vote);
      this.updateExplainAndWait();
      return {
        type: 'wait',
        metadata: {},
      };
    }

    throw new Error('Girl, what?');
  }

  private sendToAllPlayers(payload: OutgoingPlayerCommand) {
    console.log(`[${this.gameCode}] Sending to all players: ${JSON.stringify(payload)}`);
    this.players.forEach(({ id }) => {
      this.options.onCommunicate(id, payload);
    });
  }

  private sendStepToAllPresenters(step: PresenterCommandStep, metadata: PresenterCommandStepMetadata) {
    this.sendToAllPresenters({
      type: 'step',
      metadata: {
        step,
        metadata,
      },
    });
  }

  private sendToAllPresenters(payload: OutgoingPresenterCommand) {
    console.log(`[${this.gameCode}] Sending to all presenters: ${JSON.stringify(payload)}`);
    this.presenters.forEach(({ id }) => {
      this.options.onCommunicate(id, payload);
    });
  }
}

export class SocketCommunicator {
  clientIdToSocketId: { [key: string]: string } = {};

  playerLastCommandSent: { [playerId: string]: OutgoingPlayerCommand | OutgoingPresenterCommand } = {};
  gamePresenterLastCommandSentPerType: { [gameCode: string]: { [key: string]: OutgoingPresenterCommand } } = {};

  constructor(private io: socketIo.Server) {}

  register(clientId: string, socketId: string): void {
    console.log(`[COMMS] Register '${clientId}' as ${socketId}'.`);
    const existing = this.clientIdToSocketId[clientId];
    if (existing) {
      // TODO: Close / destroy existing socket.
    }
    this.clientIdToSocketId[clientId] = socketId;
    // Catchup a player / presenter in case the game is already ongoing and they reconnected
    if (Player.isPlayerId(clientId)) {
      this.playerCatchup(clientId);
    } else if (Presenter.isPresenterId(clientId)) {
      this.presenterCatchup(clientId);
    }
  }

  send(clientId: string, payload: OutgoingPlayerCommand | OutgoingPresenterCommand) {
    if (Player.isPlayerId(clientId)) {
      this.playerLastCommandSent[clientId] = payload;
    } else if (Presenter.isPresenterId(clientId)) {
      const gameCode = Presenter.gameCodeFromId(clientId);
      if (!this.gamePresenterLastCommandSentPerType[gameCode]) {
        this.gamePresenterLastCommandSentPerType[gameCode] = {};
      }
      this.gamePresenterLastCommandSentPerType[gameCode][payload.type] = payload as OutgoingPresenterCommand;
    }

    const socketId = this.clientIdToSocketId[clientId];
    if (!socketId) {
      console.log(`[COMMS] WARNING! No socket found for client: '${clientId}'.`);
      return;
    }
    this.io.to(socketId).emit(SOCKET_EVENTS.COMMAND, payload);
  }

  playerCatchup(clientId: string) {
    // Resend the last command we sent to player
    const command = this.playerLastCommandSent[clientId];
    if (command) {
      this.send(clientId, command);
    }
  }

  presenterCatchup(clientId: string) {
    // Resend the last of every type of command to the presenter
    const gameCode = Presenter.gameCodeFromId(clientId);
    Object.values(this.gamePresenterLastCommandSentPerType[gameCode] || {}).forEach((v) => {
      this.send(clientId, v);
    });
  }
}

export const waitFor = async (second: number) => {
  await new Promise((resolve) => setTimeout(resolve, second * 1000));
};

// TODO: Standardize with where these IDs are generated

const inspirations = ['Do it for glory!', 'Go for gold!', 'Be simply the best!'];
const sumOfScores = (scores: { value: number }[]) => {
  return scores.reduce((memo, x) => memo + x.value, 0);
};
