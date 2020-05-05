import Koa from 'koa';
import Router from 'koa-router';
import socketIo from 'socket.io';
import { applyMiddleware } from './middleware';
import { generateRoomCode } from './util';
import { TKO, SocketCommunicator } from './Games/TKO';
import { IncomingCommand } from '../lib/SharedTypes';

const env = {
  port: process.env.PORT || 7024,
};

const app = new Koa();
const router = new Router();

export type GameSetType = { game: TKO };

const gameMap: { [roomCode: string]: GameSetType } = {};

const createGame = () => {};

router.post('/start', (ctx, next) => {
  const roomCode = generateRoomCode();
  gameMap[roomCode] = {
    game: new TKO({ onCommunicate: (playerId, command) => {} }),
  };

  ctx.body = { roomCode };
});

router.post('/:code/command', (ctx, next) => {
  const code = ctx.params.code;
  const playerId = ctx.params.playerId;
  const command = ctx.request.body as IncomingCommand;

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

  set.game.input(command);
  ctx.body = { success: true };
});

applyMiddleware(app);
app.use(router.routes());
app.use(router.allowedMethods());

const http = app.listen(env.port, () => {
  console.log(`Listening on port ${env.port}`);
});

const io = socketIo.listen(http);
io.on('connection', (socket) => {
  console.log(`[Connected] ${socket.id}`);
});
