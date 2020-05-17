import compose = require('koa-compose');
import Koa from 'koa';
import send from 'koa-send';
import path from 'path';
import bodyParser from 'koa-bodyparser';

export type MiddlewareType = compose.Middleware<Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext>>;

export const applyMiddleware = (app: Koa<any, any>): void => {
  for (let middleware of OrderedMiddleware) {
    app.use(middleware);
  }
};

const OrderedMiddleware: MiddlewareType[] = [
  // Setup bodyparser
  bodyParser(),
  // Logger
  async (ctx, next) => {
    await next();
    const rt = ctx.response.get('X-Response-Time');
    console.log(`${ctx.method} ${ctx.url} - ${rt}`);
  },
  // Measure Response Time
  async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
  },
  // Static file server
  async (ctx, next) => {
    const PROJECT_ROOT = process.cwd();

    if (ctx.path === '/') {
      return send(ctx, '/index.html', {
        root: path.resolve(PROJECT_ROOT, 'dist-remote'),
      });
    }

    if (ctx.path === '/watch') {
      return send(ctx, '/index.html', {
        root: path.resolve(PROJECT_ROOT, 'dist-presenter'),
      });
    }

    // KLUDGE: + because sometimes a dist/dist sneaks in. FIXME PLEASE
    // DOUBLE KLUDGE: Seems to be inconsistent?
    const distRemoteCheckerRegex = /^(\/?dist-remote\/)+/;
    if (distRemoteCheckerRegex.test(ctx.path)) {
      const relativePath = ctx.path.replace(distRemoteCheckerRegex, '');
      return send(ctx, relativePath, {
        root: path.resolve(PROJECT_ROOT, 'dist-remote'),
      });
    }

    const distPresenterCheckerRegex = /^(\/?dist-presenter\/)+/;
    if (distPresenterCheckerRegex.test(ctx.path)) {
      const relativePath = ctx.path.replace(distPresenterCheckerRegex, '');
      return send(ctx, relativePath, {
        root: path.resolve(PROJECT_ROOT, 'dist-presenter'),
      });
    }

    await next();
  },
];
