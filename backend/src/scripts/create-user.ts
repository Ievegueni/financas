// Uso: npm run user:create -- --nome "Nome" --email eu@exemplo.com
// A password é pedida no terminal (não fica no histórico da shell).
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';

const { values } = parseArgs({
  options: { nome: { type: 'string' }, email: { type: 'string' } },
});

const input = z
  .object({
    nome: z.string().trim().min(1, 'nome obrigatório'),
    email: z.string().trim().toLowerCase().email('email inválido'),
  })
  .safeParse(values);

if (!input.success) {
  console.error(input.error.issues.map((i) => i.message).join('\n'));
  console.error('Uso: npm run user:create -- --nome "Nome" --email eu@exemplo.com');
  process.exit(1);
}

async function readPassword(): Promise<string> {
  if (process.env.USER_PASSWORD) return process.env.USER_PASSWORD;
  const rl = createInterface({ input: stdin, output: stdout });
  const pw = await rl.question('Password (mín. 10 caracteres): ');
  rl.close();
  return pw;
}

const password = await readPassword();
if (password.length < 10) {
  console.error('Password demasiado curta (mín. 10 caracteres).');
  process.exit(1);
}

const { nome, email } = input.data;
const passwordHash = await hashPassword(password);
const user = await prisma.user.upsert({
  where: { email },
  create: { nome, email, passwordHash },
  update: { nome, passwordHash },
});
console.log(`Utilizador pronto: ${user.email} (${user.id})`);
await prisma.$disconnect();
