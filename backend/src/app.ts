import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import type { Env } from './lib/env.js';
import { authRoutes, SESSION_COOKIE } from './routes/auth.js';
import type { UserStore } from './services/auth.js';

declare module 'fastify' {
  interface FastifyContextConfig {
    public?: boolean;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

export interface AppDeps {
  env: Pick<Env, 'JWT_SECRET' | 'COOKIE_SECRET' | 'NODE_ENV'>;
  db: UserStore;
}

export async function buildApp({ env, db }: AppDeps) {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
    trustProxy: env.NODE_ENV === 'production', // atrás do Nginx
  });

  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
  });
  await app.register(rateLimit, { global: false });

  // Tudo exige sessão, exceto rotas marcadas com config.public.
  app.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.config?.public) return;
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Não autenticado' });
    }
  });

  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth', db, secureCookie: env.NODE_ENV === 'production' });
    },
    { prefix: '/api' },
  );

  return app;
}
