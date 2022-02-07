import Koa from 'koa';
import cors from 'koa2-cors';
import Router from 'koa-router';
import socketIo from 'socket.io';
import { applyMiddleware, MiddlewareType } from './middleware';
import { generateRoomCode } from './util';
import { TKO, SocketCommunicator } from './Games/TKO';
import {
  CommandBody,
  SOCKET_EVENTS,
  ClientSocketIdentifierProps,
  PlayerJoinResult,
  PlayerCommandType,
  GameCreateResult,
} from '../lib/SharedTypes';
import { IGame } from './Games/Game';
import { blue, blueBright, yellowBright } from 'chalk';
import { Ranker } from './Games/Ranker';

console.log('CWD IS ' + process.cwd());

const env = {
  port: process.env.PORT || 7024,
};

export interface CustomKoaContext {
  gameSet: GameSetType;
}

const app = new Koa<Koa.DefaultState, CustomKoaContext>();
const router = new Router<any, CustomKoaContext>();

export type GameSetType = { game: IGame };
const gameMap: { [roomCode: string]: GameSetType } = {};

const ensureRoomCodeExists: MiddlewareType = async (ctx, next) => {
  const code = ctx.params.code;
  const set = gameMap[code];
  if (!set) {
    ctx.status = 400;
    ctx.body = `Invalid game code: ${code}.`;
  } else {
    ctx.gameSet = set;
    await next();
  }
};

router.post('/:code/start', ensureRoomCodeExists, (ctx, next) => {
  const set = ctx.gameSet;
  set.game.orchestrate();
  ctx.body = { success: true };
});

router.post('/:code/join', ensureRoomCodeExists, (ctx, next) => {
  const name = ctx.request.body.name;

  if (!name) {
    ctx.status = 400;
    ctx.body = 'Where your name at?';
    return next();
  }

  const set = ctx.gameSet;
  const existingPlayer = set.game.playerByName(name);
  if (existingPlayer) {
    // Player exists. We assume they disconnected and they're just replacing the old one.
    ctx.body = { player: existingPlayer, gameType: set.game.gameType };
    console.log(yellowBright(`'${existingPlayer.id}' joined game ${set.game.gameCode}'.`));
    return next();
  }

  const player = set.game.addPlayer(name);
  console.log(yellowBright(`'${player.id}' joined game '${set.game.gameCode}'.`));
  ctx.body = { player } as PlayerJoinResult;
});

router.post('/:code/watch', ensureRoomCodeExists, (ctx, next) => {
  const set = ctx.gameSet;
  const presenter = set.game.addPresenter();
  ctx.body = { presenter };
});

router.post('/:code/command', ensureRoomCodeExists, (ctx, next) => {
  const playerId = ctx.request.body.playerId;
  // TODO: Clean up types here
  const command = ctx.request.body.command as CommandBody & { type: PlayerCommandType };

  const set = ctx.gameSet;
  if (!set.game.hasPlayerId(playerId)) {
    ctx.status = 401;
    ctx.body = `You don't even go to: ${set.game.gameCode}.`;
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
  const game = new Ranker({
    onCommunicate: (playerId, command) => {
      console.log(`Communicating to ${playerId}: ${JSON.stringify(command, null, 2)}`);
      communicator.send(playerId, command);
    },
  });
  while (gameMap[game.gameCode]) {
    // Regenerate room code if it already exists
    game.gameCode = generateRoomCode();
  }
  gameMap[game.gameCode] = { game };

  console.log(blueBright(`New game created: ${game.gameCode}`));

  const presenter = game.addPresenter(true);
  ctx.body = { roomCode: game.gameCode, presenter } as GameCreateResult;
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
