import { v4 } from 'uuid';
import { IncomingCommand, OutgoingCommand, SOCKET_EVENTS } from '../../lib/SharedTypes';
import socketIo from 'socket.io';
import { Player, IGame } from './Game';

export interface TKOProps {
  onCommunicate: OnCommunicateType;
}

export type OnCommunicateType = (playerId: string, payload: OutgoingCommand) => void;

export class TKO implements IGame {
  players: Player[] = [];

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
  }

  private async collectDesigns() {}

  input(command: IncomingCommand): void {
    console.log(`Received command: ${JSON.stringify(command)}`);
  }
}

export class SocketCommunicator {
  playerIdToSocketId: { [key: string]: string } = {};

  constructor(private io: socketIo.Server) {}

  register(playerId: string, socketId: string): void {
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
