import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

const TABLES = ['usuarios', 'clientes', 'sesiones'];

describe('migraciones', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      ...buildDataSourceOptions(loadTestEnvironment()),
      entities: ENTITIES,
      migrations: MIGRATIONS,
    });
    await dataSource.initialize();
    // Parte de una base de tests vacía.
    await dataSource.dropDatabase();
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  it('up crea las tablas, los índices únicos y las claves foráneas', async () => {
    await dataSource.runMigrations();

    const queryRunner = dataSource.createQueryRunner();
    try {
      for (const table of TABLES) {
        expect(await queryRunner.hasTable(table)).toBe(true);
      }

      const uniqueIndexes: { name: string }[] = await queryRunner.query(
        `SELECT DISTINCT INDEX_NAME AS name FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND NON_UNIQUE = 0 AND INDEX_NAME <> 'PRIMARY'`,
      );
      expect(uniqueIndexes.map((index) => index.name).sort()).toEqual([
        'UQ_clientes_cuit',
        'UQ_clientes_dni',
        'UQ_usuarios_email',
      ]);

      const foreignKeys: { tabla: string; columna: string }[] = await queryRunner.query(
        `SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'usuarios'`,
      );
      expect(foreignKeys.map((fk) => `${fk.tabla}.${fk.columna}`).sort()).toEqual([
        'clientes.usuarioId',
        'sesiones.usuarioId',
        'usuarios.creadoPorId',
        'usuarios.modificadoPorId',
      ]);
    } finally {
      await queryRunner.release();
    }
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('down elimina las tablas sin errores', async () => {
    await dataSource.undoLastMigration();

    const queryRunner = dataSource.createQueryRunner();
    try {
      for (const table of TABLES) {
        expect(await queryRunner.hasTable(table)).toBe(false);
      }
    } finally {
      await queryRunner.release();
    }
  });
});
