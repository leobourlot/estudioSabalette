import { defineConfig } from 'vitest/config';

// Tests unitarios: archivos *.spec.ts junto al código en src/.
export default defineConfig({
  test: {
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
