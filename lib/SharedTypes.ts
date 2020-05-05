export interface IncomingCommand {
  sourcePlayerId: string;
  type: CommandType;
  metadata: any;
}
export interface OutgoingCommand {
  type: CommandType;
  metadata: any;
}

export type CommandType = 'shirt' | 'design' | 'slogan' | 'vote' | 'score';

export enum SOCKET_EVENTS {
  COMMAND = 'command',
}
