import type { PrismaClient, User } from '@prisma/client';
import { hashPassword, verifyPassword } from '../lib/password.js';

export type UserStore = Pick<PrismaClient, 'user'>;
export type PublicUser = Pick<User, 'id' | 'nome' | 'email'>;

// Hash fictício para gastar o mesmo tempo quando o email não existe.
let dummyHash: Promise<string> | undefined;

export async function authenticate(
  db: UserStore,
  email: string,
  password: string,
): Promise<PublicUser | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    dummyHash ??= hashPassword('dummy-password-para-timing');
    await verifyPassword(await dummyHash, password);
    return null;
  }
  const ok = await verifyPassword(user.passwordHash, password);
  return ok ? { id: user.id, nome: user.nome, email: user.email } : null;
}

export async function findPublicUser(db: UserStore, id: string): Promise<PublicUser | null> {
  return db.user.findUnique({ where: { id }, select: { id: true, nome: true, email: true } });
}
