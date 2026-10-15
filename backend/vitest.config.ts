import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      JWT_SECRET: 'test-jwt-secret-com-pelo-menos-32-caracteres',
      COOKIE_SECRET: 'test-cookie-secret-com-pelo-menos-32-caracteres',
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    },
  },
});
