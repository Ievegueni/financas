import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { conflict, notFound } from '../lib/errors.js';
import { categoriaCreate, categoriaUpdate } from '../schemas/cadastros.js';
import { empresaQuery, idParam } from '../schemas/common.js';

export async function categoriaRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  app.get('/', async (request) => {
    const { empresaId } = empresaQuery.parse(request.query);
    return db.categoria.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
  });

  app.get('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const categoria = await db.categoria.findUnique({ where: { id } });
    if (!categoria) throw notFound('Categoria');
    return categoria;
  });

  app.post('/', async (request, reply) => {
    const data = categoriaCreate.parse(request.body);
    reply.code(201);
    return db.categoria.create({ data });
  });

  app.patch('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const data = categoriaUpdate.parse(request.body);
    return db.categoria.update({ where: { id }, data });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = idParam.parse(request.params);
    if (await db.movimento.count({ where: { categoriaId: id } })) {
      throw conflict('A categoria está em uso. Desative-a em vez de eliminar.');
    }
    await db.categoria.delete({ where: { id } });
    return reply.code(204).send();
  });
}
