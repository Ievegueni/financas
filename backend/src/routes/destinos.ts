import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { conflict, notFound } from '../lib/errors.js';
import { destinoCreate, destinoUpdate } from '../schemas/cadastros.js';
import { empresaQuery, idParam } from '../schemas/common.js';

export async function destinoRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  app.get('/', async (request) => {
    const { empresaId } = empresaQuery.parse(request.query);
    return db.destino.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
  });

  app.get('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const destino = await db.destino.findUnique({ where: { id } });
    if (!destino) throw notFound('Destino');
    return destino;
  });

  app.post('/', async (request, reply) => {
    const data = destinoCreate.parse(request.body);
    reply.code(201);
    return db.destino.create({ data });
  });

  app.patch('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const data = destinoUpdate.parse(request.body);
    return db.destino.update({ where: { id }, data });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = idParam.parse(request.params);
    if (await db.movimento.count({ where: { destinoId: id } })) {
      throw conflict('O destino está em uso. Desative-o em vez de eliminar.');
    }
    await db.destino.delete({ where: { id } });
    return reply.code(204).send();
  });
}
