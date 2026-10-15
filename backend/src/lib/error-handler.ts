import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export function errorHandler(err: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  if (err instanceof ZodError) {
    return reply.code(400).send({
      error: 'Dados inválidos',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return reply.code(409).send({ error: 'Já existe um registo com esse nome' });
    if (err.code === 'P2025') return reply.code(404).send({ error: 'Registo não encontrado' });
    if (err.code === 'P2003') return reply.code(400).send({ error: 'Referência inválida' });
  }
  const status = 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : 500;
  if (status < 500) return reply.code(status).send({ error: err.message });
  request.log.error(err);
  return reply.code(500).send({ error: 'Erro interno' });
}
