import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { conflict, notFound } from '../lib/errors.js';
import { carteiraCreate, carteiraUpdate } from '../schemas/cadastros.js';
import { empresaQuery, idParam } from '../schemas/common.js';

export async function carteiraRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  app.get('/', async (request) => {
    const { empresaId } = empresaQuery.parse(request.query);
    return db.carteira.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
  });

  app.get('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const carteira = await db.carteira.findUnique({ where: { id } });
    if (!carteira) throw notFound('Carteira');
    return carteira;
  });

  app.post('/', async (request, reply) => {
    const data = carteiraCreate.parse(request.body);
    reply.code(201);
    return db.carteira.create({ data });
  });

  app.patch('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const data = carteiraUpdate.parse(request.body);
    const atual = await db.carteira.findUnique({ where: { id } });
    if (!atual) throw notFound('Carteira');
    // Moeda do movimento = moeda da carteira: não pode mudar depois de haver movimentos.
    if (data.moeda && data.moeda !== atual.moeda && (await db.movimento.count({ where: { carteiraId: id } }))) {
      throw conflict('A carteira tem movimentos; a moeda não pode ser alterada.');
    }
    return db.carteira.update({ where: { id }, data });
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = idParam.parse(request.params);
    if (await db.movimento.count({ where: { carteiraId: id } })) {
      throw conflict('A carteira tem movimentos. Desative-a em vez de eliminar.');
    }
    await db.carteira.delete({ where: { id } });
    return reply.code(204).send();
  });
}
