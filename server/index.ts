import Koa from 'koa';
import cors from 'koa2-cors';
import Router from 'koa-router';
import socketIo from 'socket.io';
import { applyMiddleware } from './middleware';
import { generateRoomCode } from './util';
import { TKO, SocketCommunicator } from './Games/TKO';
import {
  CommandBody,
  SOCKET_EVENTS,
  ClientSocketIdentifierProps,
  PlayerJoinResult,
  PlayerCommandType,
} from '../lib/SharedTypes';
import { IGame } from './Games/Game';

const env = {
  port: process.env.PORT || 7024,
};

const app = new Koa();
const router = new Router();

export type GameSetType = { game: IGame };
const gameMap: { [roomCode: string]: GameSetType } = {};

router.post('/:code/start', (ctx, next) => {
  const code = ctx.params.code;
  const set = gameMap[code];
  if (!set) {
    ctx.status = 400;
    ctx.body = `Invalid game code: ${code}.`;
    return next();
  }
  set.game.orchestrate();
  ctx.body = { success: true };
});

router.post('/:code/join', (ctx, next) => {
  const code = ctx.params.code;
  const name = ctx.request.body.name;

  if (!name) {
    ctx.status = 400;
    ctx.body = 'Where your name at?';
    return next();
  }

  const set = gameMap[code];
  if (!set) {
    ctx.status = 400;
    ctx.body = `Invalid game code: ${code}.`;
    return next();
  }

  const existingPlayer = set.game.playerByName(name);
  if (existingPlayer) {
    // Player exists. We assume they disconnected and they're just replacing the old one.
    ctx.body = { playerId: existingPlayer.id, gameType: set.game.gameType };
    return next();
  }

  const player = set.game.addPlayer(name);
  ctx.body = { player } as PlayerJoinResult;
});

router.post('/:code/watch', (ctx, next) => {
  const code = ctx.params.code;
  const set = gameMap[code];
  if (!set) {
    ctx.status = 400;
    ctx.body = `Invalid game code: ${code}.`;
    return next();
  }

  const presenter = set.game.addPresenter();
  ctx.body = { presenter };
});

router.post('/:code/command', (ctx, next) => {
  const code = ctx.params.code;
  const playerId = ctx.request.body.playerId;
  // TODO: Clean up types here
  const command = ctx.request.body.command as CommandBody & { type: PlayerCommandType };

  const set = gameMap[code];
  if (!set) {
    ctx.status = 400;
    ctx.body = `Invalid game code: ${code}.`;
    return next();
  }

  if (!set.game.hasPlayerId(playerId)) {
    ctx.status = 401;
    ctx.body = `You don't even go to: ${code}.`;
    return next();
  }

  const resultingCommand = set.game.input({
    ...command,
    sourcePlayerId: playerId,
  });
  ctx.body = { command: resultingCommand };
});

app.use(cors());
applyMiddleware(app);
app.use(router.routes());
app.use(router.allowedMethods());

const http = app.listen(env.port, () => {
  console.log(`Listening on port ${env.port}`);
});

const io = socketIo.listen(http);
const communicator = new SocketCommunicator(io);

router.post('/create', (ctx, next) => {
  const game = new TKO({
    onCommunicate: (playerId, command) => {
      communicator.send(playerId, command);
    },
  });
  gameMap[game.gameCode] = { game };

  const presenter = game.addPresenter(true);
  ctx.body = { roomCode: game.gameCode, presenter };
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] '${socket.id}' has connected.`);
  io.sockets.clients((error: any, clients: any[]) => {
    console.log(`[Socket.io] Connection count: ${clients.length}.`);
  });
  socket.on(SOCKET_EVENTS.CLIENT_SOCKET_IDENTIFIER, (props: ClientSocketIdentifierProps) => {
    // We marry id (playerId or presenterId) to socketId
    const { id } = props;
    communicator.register(id, socket.id);
  });
  socket.on('disconnect', () => console.log(`[Socket.io] '${socket.id}' disconnected.`));
});
