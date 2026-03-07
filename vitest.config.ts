import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@url-shortener/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
});
