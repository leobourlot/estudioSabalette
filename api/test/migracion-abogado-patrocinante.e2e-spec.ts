import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { AgregarAbogadoPatrocinanteAPartes1793145297279 } from '../src/migraciones/1793145297279-agregar-abogado-patrocinante-a-partes.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

/** Spec 002, RF-15: columna del abogado patrocinante de una parte no cliente. */
describe('migración del abogado patrocinante', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const column = async () => {
    const rows: { type: string; largo: number; nullable: string }[] = await queryRunner.query(
      `SELECT DATA_TYPE AS type, CHARACTER_MAXIMUM_LENGTH AS largo, IS_NULLABLE AS nullable
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partes'
         AND COLUMN_NAME = 'abogadoPatrocinante'`,
    );
    return rows.map((row) => ({ ...row, largo: Number(row.largo) }));
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

  it('up agrega la columna opcional de hasta 110 caracteres', async () => {
    expect(await column()).toEqual([{ type: 'varchar', largo: 110, nullable: 'YES' }]);
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('down quita la columna y conserva la tabla de partes', async () => {
    const fromCounsel =
      MIGRATIONS.length - MIGRATIONS.indexOf(AgregarAbogadoPatrocinanteAPartes1793145297279);
    for (let index = 0; index < fromCounsel; index++) await dataSource.undoLastMigration();

    expect(await column()).toEqual([]);
    expect(await queryRunner.hasTable('partes')).toBe(true);

    // Deja la base como la encontró, con todas las migraciones aplicadas.
    await dataSource.runMigrations();
  });
});
