import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import type { PrismaClient } from '@prisma/client';
import './lib/decimal.js';
import type { Env } from './lib/env.js';
import { errorHandler } from './lib/error-handler.js';
import { authRoutes, SESSION_COOKIE } from './routes/auth.js';
import { carteiraRoutes } from './routes/carteiras.js';
import { categoriaRoutes } from './routes/categorias.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { destinoRoutes } from './routes/destinos.js';
import { empresaRoutes } from './routes/empresas.js';
import { movimentoRoutes } from './routes/movimentos.js';
import { saldoRoutes } from './routes/saldos.js';
import { taxaRoutes } from './routes/taxas.js';

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
  db: PrismaClient;
}

export async function buildApp({ env, db }: AppDeps) {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
    trustProxy: env.NODE_ENV === 'production', // atrás do Nginx
  });

  app.setErrorHandler(errorHandler);

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
      await api.register(empresaRoutes, { prefix: '/empresas', db });
      await api.register(carteiraRoutes, { prefix: '/carteiras', db });
      await api.register(categoriaRoutes, { prefix: '/categorias', db });
      await api.register(destinoRoutes, { prefix: '/destinos', db });
      await api.register(movimentoRoutes, { prefix: '/movimentos', db });
      await api.register(saldoRoutes, { prefix: '/saldos', db });
      await api.register(dashboardRoutes, { prefix: '/dashboard', db });
      await api.register(taxaRoutes, { prefix: '/taxas', db });
    },
    { prefix: '/api' },
  );

  return app;
}
