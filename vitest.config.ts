import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Due gruppi di test:
 * - unit: veloci, senza rete né database (comando `npm test`);
 * - integration: contro lo stack locale di Supabase (`supabase start`, comando `npm run test:integration`).
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30000,
        },
      },
    ],
  },
});
