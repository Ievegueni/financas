import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { movimentoFiltros } from '../schemas/movimentos.js';
import { exportarMovimentos } from '../services/exportar.js';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'empresa';

export async function exportarRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  // Mesmos filtros do histórico (GET /movimentos), sem paginação.
  app.get('/movimentos.xlsx', async (request, reply) => {
    const filtros = movimentoFiltros.parse(request.query);
    const { buffer, empresa } = await exportarMovimentos(db, filtros);
    const nome = `movimentos-${slug(empresa)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${nome}"`)
      .header('Cache-Control', 'no-store')
      .send(buffer);
  });
}
