import { v4 } from 'uuid';
import { IncomingCommand, OutgoingCommand, SOCKET_EVENTS, GameType } from '../../lib/SharedTypes';
import socketIo from 'socket.io';
import { Player, IGame } from './Game';
import { Design, Slogan, Round, Shirt } from './TKOMechanics';
import { generateRoomCode, shuffle } from '../util';
import { take, pipe, compose, filter } from 'ramda';

export interface TKOProps {
  onCommunicate: OnCommunicateType;
}

export type OnCommunicateType = (playerId: string, payload: OutgoingCommand) => void;

export class TKO implements IGame {
  gameCode: string = generateRoomCode();

  players: Player[] = [];
  designs: Design[] = [];
  slogans: Slogan[] = [];

  currentRound: Round = new Round();

  gameType: GameType = 'tko';

  constructor(private options: TKOProps) {}

  addPlayer(name: string): Player {
    const player: Player = {
      id: v4(),
      name,
    };

    this.players.push(player);
    return player;
  }

  hasPlayerId(playerId: string): boolean {
    return !!this.players.find((p) => p.id === playerId);
  }

  playerByName(name: string): Player | undefined {
    return this.players.find((p) => p.name === name);
  }

  async orchestrate() {
    await this.collectDesigns();
    await this.collectDesigns();
    await this.collectSlogans();
    this.sendToAll({ type: 'wait', metadata: {} });
    await this.collectShirts(this.designs, this.slogans);
    this.sendToAll({ type: 'wait', metadata: {} });
  }

  private async collectDesigns() {
    const targetDesignCount = this.designs.length + this.players.length;
    this.sendToAll({
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
    this.sendToAll({
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

  input(command: IncomingCommand): OutgoingCommand {
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
    throw new Error('Girl, what?');
  }

  private sendToAll(payload: OutgoingCommand) {
    console.log(`[${this.gameCode}] Sending to all: ${JSON.stringify(payload)}`);
    this.players.forEach(({ id }) => {
      this.options.onCommunicate(id, payload);
    });
  }
}

export class SocketCommunicator {
  playerIdToSocketId: { [key: string]: string } = {};
  lastCommandSent: { [playerId: string]: OutgoingCommand } = {};

  constructor(private io: socketIo.Server) {}

  register(playerId: string, socketId: string): void {
    console.log(`[COMMS] Register '${playerId}' as ${socketId}'.`);
    const existing = this.playerIdToSocketId[playerId];
    if (existing) {
      // TODO: Close / destroy existing socket.
    }
    this.playerIdToSocketId[playerId] = socketId;
    // Catchup a player in case the game is already ongoing and they reconnected
    this.catchup(playerId);
  }

  send(playerId: string, payload: OutgoingCommand) {
    this.lastCommandSent[playerId] = payload;
    const socketId = this.playerIdToSocketId[playerId];
    if (!socketId) {
      console.log(`[COMMS] WARNING! No socket found for player: '${playerId}'.`);
      return;
    }
    this.io.to(socketId).emit(SOCKET_EVENTS.COMMAND, payload);
  }

  catchup(playerId: string) {
    // Resend the last command we sent to player
    const command = this.lastCommandSent[playerId];
    if (command) {
      this.send(playerId, command);
    }
  }
}
