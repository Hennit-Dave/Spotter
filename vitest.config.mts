import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // The same @/ alias as tsconfig.json.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Database-backed tests run only with `npm run test:db`, against the Neon test branch.
    exclude: ['**/node_modules/**', '**/*.db.test.ts'],
  },
});
