import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { conflict, notFound } from '../lib/errors.js';
import { empresaCreate, empresaUpdate } from '../schemas/cadastros.js';
import { idParam } from '../schemas/common.js';

export async function empresaRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  app.get('/', async () => db.empresa.findMany({ orderBy: { nome: 'asc' } }));

  app.get('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const empresa = await db.empresa.findUnique({ where: { id } });
    if (!empresa) throw notFound('Empresa');
    return empresa;
  });

  app.post('/', async (request, reply) => {
    const data = empresaCreate.parse(request.body);
    reply.code(201);
    return db.empresa.create({ data });
  });

  app.patch('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const data = empresaUpdate.parse(request.body);
    return db.empresa.update({ where: { id }, data });
  });

  // Só elimina empresas sem movimentos; os cadastros dela vão junto.
  app.delete('/:id', async (request, reply) => {
    const { id } = idParam.parse(request.params);
    if (await db.movimento.count({ where: { empresaId: id } })) {
      throw conflict('A empresa tem movimentos. Desative-a em vez de eliminar.');
    }
    await db.$transaction([
      db.carteira.deleteMany({ where: { empresaId: id } }),
      db.categoria.deleteMany({ where: { empresaId: id } }),
      db.destino.deleteMany({ where: { empresaId: id } }),
      db.empresa.delete({ where: { id } }),
    ]);
    return reply.code(204).send();
  });
}
