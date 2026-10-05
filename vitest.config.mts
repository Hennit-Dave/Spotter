import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Database-backed tests run only with `npm run test:db`, against the Neon test branch.
    exclude: ['**/node_modules/**', '**/*.db.test.ts'],
  },
});
