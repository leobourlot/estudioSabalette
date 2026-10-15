/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Año de la leyenda de derechos del pie de página: el de la publicación del sitio (spec 007,
  // RF-44). Es el mismo en el build del navegador y en el de Node, así el HTML prerenderizado y la
  // hidratación coinciden.
  define: {
    __ANIO_PUBLICACION__: JSON.stringify(new Date().getFullYear()),
  },
  server: {
    // En desarrollo, las llamadas a /api van a NestJS (ver plan 001, Topología).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/configuracion-tests.ts'],
  },
});
