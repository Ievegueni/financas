import type { FastifyInstance } from 'fastify';
import { loginSchema } from '../schemas/auth.js';
import { authenticate, findPublicUser, type UserStore } from '../services/auth.js';

export const SESSION_COOKIE = 'token';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export async function authRoutes(app: FastifyInstance, opts: { db: UserStore; secureCookie: boolean }) {
  app.post(
    '/login',
    {
      config: {
        public: true,
        rateLimit: { max: 5, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Dados inválidos' });
      }
      const user = await authenticate(opts.db, parsed.data.email, parsed.data.password);
      if (!user) {
        return reply.code(401).send({ error: 'Email ou password incorretos' });
      }
      const token = app.jwt.sign({ sub: user.id }, { expiresIn: SESSION_MAX_AGE });
      reply.setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: opts.secureCookie,
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_MAX_AGE,
      });
      return { user };
    },
  );

  app.post('/logout', { config: { public: true } }, async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/me', async (request, reply) => {
    const user = await findPublicUser(opts.db, request.user.sub);
    if (!user) {
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      return reply.code(401).send({ error: 'Sessão inválida' });
    }
    return { user };
  });
}
