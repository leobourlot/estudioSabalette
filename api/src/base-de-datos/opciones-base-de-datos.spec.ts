import { describe, expect, it } from 'vitest';
import type { Environment } from '../configuracion/validar-entorno.js';
import { buildDataSourceOptions } from './opciones-base-de-datos.js';

const environment: Environment = {
  PORT: 3000,
  DB_HOST: 'db.ejemplo.com',
  DB_PORT: 33060,
  DB_USERNAME: 'estudio',
  DB_PASSWORD: 'secreta',
  DB_DATABASE: 'estudio_desarrollo',
  JWT_SECRET: 'x'.repeat(32),
  TRUST_PROXY_HOPS: 0,
  FRONTEND_ORIGINS: ['http://localhost:5173'],
};

describe('buildDataSourceOptions', () => {
  const options = buildDataSourceOptions(environment);

  it('usa MySQL con los datos de conexión del entorno', () => {
    expect(options).toMatchObject({
      type: 'mysql',
      host: 'db.ejemplo.com',
      port: 33060,
      username: 'estudio',
      password: 'secreta',
      database: 'estudio_desarrollo',
    });
  });

  it('nunca sincroniza el esquema automáticamente', () => {
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
  });

  it('usa la hora de Buenos Aires y utf8mb4', () => {
    expect(options).toMatchObject({ timezone: '-03:00', charset: 'utf8mb4_unicode_ci' });
  });

  it('registra las migraciones en la tabla migraciones', () => {
    expect(options.migrationsTableName).toBe('migraciones');
  });
});
