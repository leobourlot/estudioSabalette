import { defineConfig } from 'vitest/config';

// Tests e2e: en serie, porque comparten la base de tests (ver plan 001).
export default defineConfig({
  test: {
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    // La base de tests es remota: cada test tarda unos segundos y una demora de la red
    // alcanzaba para pasar el límite de 5 s por defecto.
    testTimeout: 30_000,
    // Como en Easypanel: un proxy delante, así los tests simulan IPs con X-Forwarded-For.
    // Va acá y no en el código de los tests porque ConfigModule lee el entorno al importar
    // AppModule; las variables del proceso tienen prioridad sobre las de .env.test.
    env: { TRUST_PROXY_HOPS: '1' },
  },
});
