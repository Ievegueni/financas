import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { empresaQuery } from '../schemas/common.js';
import { calcularSaldos } from '../services/saldos.js';

export async function saldoRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  app.get('/', async (request) => {
    const { empresaId } = empresaQuery.parse(request.query);
    return calcularSaldos(db, empresaId);
  });
}
