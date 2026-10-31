import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { AgregarDniAIntegrantes1793318400000 } from '../src/migraciones/1793318400000-agregar-dni-a-integrantes.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

/** Spec 001, RF-2 y RF-8: columna del DNI de los integrantes, con el que ingresan. */
describe('migración del DNI de los integrantes', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const column = async () => {
    const rows: { type: string; largo: number; nullable: string }[] = await queryRunner.query(
      `SELECT DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS largo, IS_NULLABLE AS nullable
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'dni'`,
    );
    return rows.map((row) => ({ ...row, largo: Number(row.largo) }));
  };

  const uniqueIndex = async () => {
    const rows: { nonUnique: number }[] = await queryRunner.query(
      `SELECT NON_UNIQUE AS nonUnique FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'
         AND INDEX_NAME = 'UQ_usuarios_dni'`,
    );
    return rows.map((row) => Number(row.nonUnique));
  };

  beforeAll(async () => {
    dataSource = new DataSource({
      ...buildDataSourceOptions(loadTestEnvironment()),
      entities: ENTITIES,
      migrations: MIGRATIONS,
    });
    await dataSource.initialize();
    // Parte de una base de tests vacía y aplica todas las migraciones.
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
    queryRunner = dataSource.createQueryRunner();
  });

  afterAll(async () => {
    await queryRunner?.release();
    await dataSource?.destroy();
  });

  it('up agrega la columna opcional de hasta 8 caracteres, con índice único', async () => {
    expect(await column()).toEqual([{ type: 'varchar', largo: 8, nullable: 'YES' }]);
    expect(await uniqueIndex()).toEqual([0]);
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('down quita la columna y su índice, y conserva la tabla de usuarios', async () => {
    const fromDni = MIGRATIONS.length - MIGRATIONS.indexOf(AgregarDniAIntegrantes1793318400000);
    for (let index = 0; index < fromDni; index++) await dataSource.undoLastMigration();

    expect(await column()).toEqual([]);
    expect(await uniqueIndex()).toEqual([]);
    expect(await queryRunner.hasTable('usuarios')).toBe(true);

    // Deja la base como la encontró, con todas las migraciones aplicadas.
    await dataSource.runMigrations();
  });
});
