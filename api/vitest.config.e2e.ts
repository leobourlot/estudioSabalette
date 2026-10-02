import { defineConfig } from 'vitest/config';

// Tests e2e: en serie, porque comparten la base de tests (ver plan 001).
export default defineConfig({
  test: {
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
  },
});
