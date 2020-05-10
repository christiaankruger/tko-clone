import { v4 } from 'uuid';
import { IncomingCommand, OutgoingPlayerCommand, SOCKET_EVENTS, GameType } from '../../lib/SharedTypes';
import socketIo from 'socket.io';
import { Player, IGame, Presenter } from './Game';
import { Design, Slogan, Round, Shirt, ShirtScore, AdhocScore, shortId, Vote } from './TKOMechanics';
import { generateRoomCode, shuffle } from '../util';
import { take, pipe, compose, filter, last } from 'ramda';

export interface TKOProps {
  onCommunicate: OnCommunicateType;
}

export type OnCommunicateType = (playerId: string, payload: OutgoingPlayerCommand) => void;

export class TKO implements IGame {
  gameCode: string = generateRoomCode();

  players: Player[] = [];
  presenters: Presenter[] = [];
  designs: Design[] = [];
  slogans: Slogan[] = [];

  currentRound: Round = new Round();

  gameType: GameType = 'tko';

  constructor(private options: TKOProps) {}

  addPlayer(name: string): Player {
    const player: Player = {
      id: shortId(`player-${this.gameCode}-${name}`),
      name,
    };

    this.players.push(player);
    // TODO: Send all players to presenters
    return player;
  }

  addPresenter(isCreator: boolean = false): Presenter {
    const presenter: Presenter = {
      id: shortId(`presenter-${this.gameCode}`),
      isCreator,
    };
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
    await this.collectDesigns();
    await this.collectSlogans();
    await this.collectShirts(this.designs, this.slogans);

    for (let i = 0; i < this.currentRound.shirts.length; i++) {
      this.sendToAllPlayers({ type: 'wait', metadata: {} });
      await this.collectScoresFor(this.currentRound.shirts[i], [100, 200, 300, 400, 500]);
    }
    const allScores = this.currentRound.shirts.map((shirt) => {
      const score = this.currentRound.shirtScores
        .filter((s) => s.shirt.id === shirt.id)
        .map((shirtScore) => shirtScore.value)
        .reduce((memo, x) => memo + x, 0);
      return { shirt, score };
    });
    // TODO: Broadcast scores to presenter
    const topTwo = take(2)(allScores.sort((a, b) => b.score - a.score));
    console.log(
      `[${this.gameCode}]: Voting happens between: ${JSON.stringify(
        topTwo.map((t) => ({ shirtId: t.shirt.id, score: t.score }))
      )}`
    );

    this.sendToAllPlayers({ type: 'wait', metadata: {} });
    await this.collectVotesBetween(topTwo.map((t) => t.shirt));
    // TODO: Tally up votes, convert to scores
    // TODO: Tally up scores (remember adhoc scores)
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // TODO: Emit timer to presenter
      if (this.currentRound.shirts.length === targetShirts) {
        return;
      }
    }
  }

  input(command: IncomingCommand): OutgoingPlayerCommand {
    console.log(`[${this.gameCode}]: Received command: ${JSON.stringify(command)}`);
    if (command.type === 'design') {
      const design = new Design({
        createdBy: command.sourcePlayerId,
        base64: command.metadata.base64,
      });
      console.log(`Created design: ${JSON.stringify(design, null, 2)}`);
      this.designs.push(design);
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
      return {
        type: 'slogan',
        metadata: {},
      };
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
      const designScore = new AdhocScore({
        scorerId: command.sourcePlayerId,
        targetId: shirt.design.createdBy,
        value: value / 2,
      });
      const sloganScore = new AdhocScore({
        scorerId: command.sourcePlayerId,
        targetId: shirt.slogan.createdBy,
        value: value / 2,
      });

      console.log(`Registered a shirt score of '${shirtScore.value}' for '${shirtScore.shirt.createdBy}.`);
      console.log(`Registered a design score of '${designScore.value}' for '${designScore.targetId}.`);
      console.log(`Registered a slogan score of '${sloganScore.value}' for '${sloganScore.targetId}.`);

      this.currentRound.shirtScores.push(shirtScore);
      this.currentRound.adhocScores.push(designScore);
      this.currentRound.adhocScores.push(sloganScore);

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

  private sendToAllPresenters(payload: OutgoingPlayerCommand) {
    console.log(`[${this.gameCode}] Sending to all presenters: ${JSON.stringify(payload)}`);
    this.presenters.forEach(({ id }) => {
      this.options.onCommunicate(id, payload);
    });
  }
}

export class SocketCommunicator {
  clientIdToSocketId: { [key: string]: string } = {};
  lastCommandSent: { [playerId: string]: OutgoingPlayerCommand } = {};

  constructor(private io: socketIo.Server) {}

  register(clientId: string, socketId: string): void {
    console.log(`[COMMS] Register '${clientId}' as ${socketId}'.`);
    const existing = this.clientIdToSocketId[clientId];
    if (existing) {
      // TODO: Close / destroy existing socket.
    }
    this.clientIdToSocketId[clientId] = socketId;
    // Catchup a player in case the game is already ongoing and they reconnected
    this.catchup(clientId);
  }

  send(clientId: string, payload: OutgoingPlayerCommand) {
    this.lastCommandSent[clientId] = payload;
    const socketId = this.clientIdToSocketId[clientId];
    if (!socketId) {
      console.log(`[COMMS] WARNING! No socket found for client: '${clientId}'.`);
      return;
    }
    this.io.to(socketId).emit(SOCKET_EVENTS.COMMAND, payload);
  }

  catchup(clientId: string) {
    // Resend the last command we sent to player
    // NB: Presenter's catchup should send all previous commands, or a subset. Since e.g. 'timer' updates won't be enough on their own.
    const command = this.lastCommandSent[clientId];
    if (command) {
      this.send(clientId, command);
    }
  }
}
