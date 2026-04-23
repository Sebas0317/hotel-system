/**
 * Vitest configuration for EcoBosque Hotel System backend.
 * Tests API endpoints with Supertest.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'backups/**',
        'logs/**',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
