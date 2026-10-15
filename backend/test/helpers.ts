import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/lib/env.js';

export const prisma = new PrismaClient();

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "Movimento", "Carteira", "Categoria", "Destino", "Empresa", "TaxaCambio", "User" CASCADE',
  );
}

// App com um cliente HTTP já autenticado.
export async function authedApp() {
  const app = await buildApp({ env: loadEnv(), db: prisma });
  const cookie = `token=${app.jwt.sign({ sub: 'test-user' })}`;
  const req = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, payload, headers: { cookie } });
  return { app: app as FastifyInstance, req };
}
