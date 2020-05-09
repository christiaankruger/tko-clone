import Koa from 'koa';
import cors from 'koa2-cors';
import Router from 'koa-router';
import socketIo from 'socket.io';
import { applyMiddleware } from './middleware';
import { generateRoomCode } from './util';
import { TKO, SocketCommunicator } from './Games/TKO';
import { CommandBody, SOCKET_EVENTS, PlayerSocketIdentifierProps, PlayerJoinResult } from '../lib/SharedTypes';
import { IGame } from './Games/Game';

const env = {
  port: process.env.PORT || 7024,
};

const app = new Koa();
const router = new Router();

export type GameSetType = { game: IGame };
const gameMap: { [roomCode: string]: GameSetType } = {};

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
  ctx.body = { playerId: player.id } as PlayerJoinResult;
});

router.post('/:code/command', (ctx, next) => {
  const code = ctx.params.code;
  const playerId = ctx.request.body.playerId;
  const command = ctx.request.body.command as CommandBody;

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

  set.game.input({
    ...command,
    sourcePlayerId: playerId,
  });
  ctx.body = { success: true };
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

router.post('/start', (ctx, next) => {
  const roomCode = generateRoomCode();
  gameMap[roomCode] = {
    game: new TKO({
      onCommunicate: (playerId, command) => {
        communicator.send(playerId, command);
      },
    }),
  };

  ctx.body = { roomCode };
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] '${socket.id}' has connected.`);
  io.sockets.clients((error: any, clients: any[]) => {
    console.log(`[Socket.io] Connection count: ${clients.length}.`);
  });
  socket.on(SOCKET_EVENTS.PLAYER_SOCKET_IDENTIFIER, (props: PlayerSocketIdentifierProps) => {
    // We marry playerId to socketId
    const { playerId } = props;
    communicator.register(playerId, socket.id);
  });
  socket.on('disconnect', () => console.log(`[Socket.io] '${socket.id}' disconnected.`));
});
