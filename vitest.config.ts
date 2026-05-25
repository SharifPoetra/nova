import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/bot/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@nova/db': path.resolve(__dirname, 'packages/database/src/index.ts'),
    },
    extensions: ['.ts', '.js', '.json'],
  },
});
