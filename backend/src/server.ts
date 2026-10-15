import { buildApp } from './app.js';
import { loadEnv } from './lib/env.js';
import { prisma } from './lib/prisma.js';

const env = loadEnv();
const app = await buildApp({ env, db: prisma });

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.PORT, host: '127.0.0.1' });
