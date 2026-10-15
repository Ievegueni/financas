import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './test-db.js';

// Aplica as migrações na BD de testes antes de correr os testes.
export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
