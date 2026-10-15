import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { taxaCreate, taxaListQuery } from '../schemas/taxas.js';

// Histórico da taxa USDT→AOA (AOA por 1 USDT). Global, não por empresa.
export async function taxaRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  app.get('/', async (request) => {
    const { limit } = taxaListQuery.parse(request.query);
    return db.taxaCambio.findMany({ orderBy: [{ data: 'desc' }, { id: 'desc' }], take: limit });
  });

  app.post('/', async (request, reply) => {
    const data = taxaCreate.parse(request.body);
    reply.code(201);
    return db.taxaCambio.create({ data });
  });
}
