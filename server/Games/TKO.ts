import { v4 } from 'uuid';
import { IncomingCommand, OutgoingCommand, SOCKET_EVENTS, GameType } from '../../lib/SharedTypes';
import socketIo from 'socket.io';
import { Player, IGame } from './Game';
import { Design, Slogan } from './TKOMechanics';
import { generateRoomCode } from '../util';

export interface TKOProps {
  onCommunicate: OnCommunicateType;
}

export type OnCommunicateType = (playerId: string, payload: OutgoingCommand) => void;

export class TKO implements IGame {
  gameCode: string = generateRoomCode();

  players: Player[] = [];
  designs: Design[] = [];
  slogans: Slogan[] = [];

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
    console.log('Got all designs, thanks!');
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
    throw new Error('Girl, what?');
  }

  private sendToAll(payload: OutgoingCommand) {
    this.players.forEach(({ id }) => {
      this.options.onCommunicate(id, payload);
    });
  }
}

export class SocketCommunicator {
  playerIdToSocketId: { [key: string]: string } = {};

  constructor(private io: socketIo.Server) {}

  register(playerId: string, socketId: string): void {
    console.log(`[COMMS] Register '${playerId}' as ${socketId}'.`);
    const existing = this.playerIdToSocketId[playerId];
    if (existing) {
      // TODO: Close / destroy existing socket.
    }
    this.playerIdToSocketId[playerId] = socketId;
  }

  send(playerId: string, payload: OutgoingCommand) {
    const socketId = this.playerIdToSocketId[playerId];
    this.io.to(socketId).emit(SOCKET_EVENTS.COMMAND, payload);
  }
}
