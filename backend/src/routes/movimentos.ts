import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { idParam } from '../schemas/common.js';
import { movimentoCreate, movimentoListQuery, movimentoUpdate } from '../schemas/movimentos.js';
import {
  atualizarMovimento,
  criarMovimento,
  eliminarMovimento,
  listarMovimentos,
} from '../services/movimentos.js';

export async function movimentoRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  app.get('/', async (request) => listarMovimentos(db, movimentoListQuery.parse(request.query)));

  app.post('/', async (request, reply) => {
    const mov = await criarMovimento(db, movimentoCreate.parse(request.body));
    reply.code(201);
    return mov;
  });

  app.patch('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    return atualizarMovimento(db, id, movimentoUpdate.parse(request.body));
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = idParam.parse(request.params);
    await eliminarMovimento(db, id);
    return reply.code(204).send();
  });
}
