import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { periodoQuery } from '../schemas/movimentos.js';
import { calcularDashboard } from '../services/dashboard.js';

export async function dashboardRoutes(app: FastifyInstance, { db }: { db: PrismaClient }) {
  app.get('/', async (request) => calcularDashboard(db, periodoQuery.parse(request.query)));
}
