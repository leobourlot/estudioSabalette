import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { ENTITIES, MIGRATIONS } from '../../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../../src/base-de-datos/opciones-base-de-datos.js';
import { configureApp } from '../../src/configurar-aplicacion.js';
import { loadTestEnvironment } from './base-de-tests.js';

const TABLES = ['sesiones', 'clientes', 'usuarios'];

/** Aplica las migraciones pendientes sobre la base de tests. */
async function migrateTestDatabase(): Promise<void> {
  const dataSource = new DataSource({
    ...buildDataSourceOptions(loadTestEnvironment()),
    entities: ENTITIES,
    migrations: MIGRATIONS,
  });
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}

/** Vacía todas las tablas de la base de tests. */
export async function clearTables(app: NestExpressApplication): Promise<void> {
  const queryRunner = app.get(DataSource).createQueryRunner();
  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) {
      await queryRunner.query(`TRUNCATE TABLE \`${table}\``);
    }
  } finally {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.release();
  }
}

/**
 * Levanta la aplicación completa contra la base de tests, con la misma configuración
 * HTTP que main.ts, y deja las tablas vacías.
 */
export async function createTestApp(): Promise<NestExpressApplication> {
  // Valida .env.test (y que la base sea de tests) antes de tocar nada.
  loadTestEnvironment();
  await migrateTestDatabase();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  await clearTables(app);
  return app;
}
