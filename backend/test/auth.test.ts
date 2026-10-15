import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { User } from '@prisma/client';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/lib/env.js';
import { hashPassword } from '../src/lib/password.js';
import type { UserStore } from '../src/services/auth.js';

const PASSWORD = 'password-segura-123';
let user: User;

function fakeDb(): UserStore {
  return {
    user: {
      findUnique: async ({
        where,
        select,
      }: {
        where: { id?: string; email?: string };
        select?: Partial<Record<keyof User, boolean>>;
      }) => {
        const match = (where.id && where.id === user.id) || (where.email && where.email === user.email);
        if (!match) return null;
        if (!select) return user;
        return Object.fromEntries(Object.entries(user).filter(([k]) => select[k as keyof User]));
      },
    },
  } as unknown as UserStore;
}

async function newApp(): Promise<FastifyInstance> {
  return buildApp({ env: loadEnv(), db: fakeDb() });
}

function sessionCookie(res: { cookies: { name: string; value: string }[] }) {
  const c = res.cookies.find((x) => x.name === 'token');
  return c ? `token=${c.value}` : '';
}

beforeAll(async () => {
  user = {
    id: 'u1',
    nome: 'Dono',
    email: 'dono@exemplo.com',
    passwordHash: await hashPassword(PASSWORD),
    criadoEm: new Date(),
  };
});

describe('auth', () => {
  it('rotas sem sessão devolvem 401', async () => {
    const app = await newApp();
    expect((await app.inject({ method: 'GET', url: '/api/auth/me' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/qualquer' })).statusCode).toBe(401);
  });

  it('login válido define cookie httpOnly e /me devolve o utilizador', async () => {
    const app = await newApp();
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'DONO@exemplo.com', password: PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    const raw = String(login.headers['set-cookie']);
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Strict/i);

    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: sessionCookie(login) } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ user: { id: 'u1', nome: 'Dono', email: 'dono@exemplo.com' } });
    expect(me.body).not.toContain('passwordHash');
  });

  it('password errada ou email inexistente devolvem 401', async () => {
    const app = await newApp();
    for (const payload of [
      { email: 'dono@exemplo.com', password: 'errada' },
      { email: 'outro@exemplo.com', password: PASSWORD },
    ]) {
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload });
      expect(res.statusCode).toBe(401);
    }
  });

  it('input inválido devolve 400', async () => {
    const app = await newApp();
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'x' } });
    expect(res.statusCode).toBe(400);
  });

  it('logout limpa o cookie', async () => {
    const app = await newApp();
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers['set-cookie'])).toMatch(/token=;/);
  });

  it('rate limit no login após 5 tentativas', async () => {
    const app = await newApp();
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'dono@exemplo.com', password: 'errada' },
      });
      codes.push(res.statusCode);
    }
    expect(codes.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(codes[5]).toBe(429);
  });
});
