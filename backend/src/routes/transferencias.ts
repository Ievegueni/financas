import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { transferenciaCreate } from '../schemas/transferencias.js';
import { criarTransferencia } from '../services/transferencias.js';

export async function transferenciaRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  app.post('/', async (request, reply) => {
    const result = await criarTransferencia(db, transferenciaCreate.parse(request.body));
    reply.code(201);
    return result;
  });
}
