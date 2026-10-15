import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from './test/test-db.js';

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    env: {
      JWT_SECRET: 'test-jwt-secret-com-pelo-menos-32-caracteres',
      COOKIE_SECRET: 'test-cookie-secret-com-pelo-menos-32-caracteres',
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: 'test',
    },
  },
});
