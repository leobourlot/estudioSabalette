import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { CrearFallosYPalabrasClave1791589649680 } from '../src/migraciones/1791589649680-crear-fallos-y-palabras-clave.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

const TABLES = ['fallos', 'palabras_clave', 'fallo_palabras_clave'];
const PREVIOUS_TABLES = [
  'usuarios',
  'clientes',
  'sesiones',
  'causas',
  'partes',
  'causa_colaboradores',
  'movimientos',
  'movimiento_cambios',
];

/** Plan 005, "Entidades de TypeORM y migración": fallos y catálogo de palabras clave. */
describe('migración de jurisprudencia', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let userId: number;

  beforeAll(async () => {
    dataSource = new DataSource({
      ...buildDataSourceOptions(loadTestEnvironment()),
      entities: ENTITIES,
      migrations: MIGRATIONS,
    });
    await dataSource.initialize();
    // Parte de una base de tests vacía y aplica todas las migraciones, incluidas las de las
    // specs 001 a 003.
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
    queryRunner = dataSource.createQueryRunner();

    const user: { insertId: number } = await queryRunner.query(
      `INSERT INTO usuarios (rol, nombre, apellido, contrasenaHash) VALUES ('abogado', 'Ana', 'Sabalette', 'x')`,
    );
    userId = user.insertId;
  });

  afterAll(async () => {
    await queryRunner?.release();
    await dataSource?.destroy();
  });

  it('up crea las tablas con la intercalación de las specs anteriores', async () => {
    const tables: { name: string; collation: string }[] = await queryRunner.query(
      `SELECT TABLE_NAME AS name, TABLE_COLLATION AS collation FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
      [TABLES],
    );

    expect(tables.map((table) => table.name).sort()).toEqual([...TABLES].sort());
    for (const table of tables) expect(table.collation).toBe('utf8mb4_unicode_ci');
  });

  it('la clave de las palabras clave tiene intercalación binaria', async () => {
    const [column]: { collation: string }[] = await queryRunner.query(
      `SELECT COLLATION_NAME AS collation FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'palabras_clave' AND COLUMN_NAME = 'clave'`,
    );
    expect(column.collation).toBe('utf8mb4_bin');
  });

  it('up crea los índices del listado, de repetido, por palabra y el único de la clave', async () => {
    const indexes: { name: string; columna: string; noUnico: number }[] = await queryRunner.query(
      `SELECT INDEX_NAME AS name, COLUMN_NAME AS columna, NON_UNIQUE AS noUnico
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)
         AND (INDEX_NAME LIKE 'IDX_%' OR INDEX_NAME LIKE 'UQ_%')
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [TABLES],
    );

    expect(indexes.map((index) => `${index.name}.${index.columna}`)).toEqual([
      'IDX_fallo_palabras_clave_palabra.palabraClaveId',
      'IDX_fallo_palabras_clave_palabra.falloId',
      'IDX_fallos_listado.activo',
      'IDX_fallos_listado.fecha',
      'IDX_fallos_listado.creadoEn',
      'IDX_fallos_listado.id',
      'IDX_fallos_repetido.tribunal',
      'IDX_fallos_repetido.numero',
      'UQ_palabras_clave_clave.clave',
    ]);
    const unique = indexes.find((index) => index.name === 'UQ_palabras_clave_clave');
    expect(Number(unique?.noUnico)).toBe(0);
  });

  it('up crea las claves foráneas a fallos, palabras clave y usuarios', async () => {
    const foreignKeys: { columna: string; referencia: string }[] = await queryRunner.query(
      `SELECT CONCAT(TABLE_NAME, '.', COLUMN_NAME) AS columna,
              CONCAT(REFERENCED_TABLE_NAME, '.', REFERENCED_COLUMN_NAME) AS referencia
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?) AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [TABLES],
    );

    expect(foreignKeys.map((fk) => `${fk.columna} -> ${fk.referencia}`).sort()).toEqual([
      'fallo_palabras_clave.falloId -> fallos.id',
      'fallo_palabras_clave.palabraClaveId -> palabras_clave.id',
      'fallos.creadoPorId -> usuarios.id',
      'fallos.modificadoPorId -> usuarios.id',
    ]);
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('guarda la fecha como día y la lee como el mismo texto AAAA-MM-DD (RNF de fechas)', async () => {
    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO fallos (caratula, tribunal, fuero, fecha, sumario, creadoPorId, creadoEn)
       VALUES ('Sojo, Eduardo', 'CSJN', 'federal', '1887-05-03', 'Sumario del fallo.', ?, NOW(6))`,
      [userId],
    );

    const [raw]: { fecha: unknown; activo: number }[] = await queryRunner.query(
      'SELECT fecha, activo FROM fallos WHERE id = ?',
      [result.insertId],
    );
    expect(raw).toEqual({ fecha: '1887-05-03', activo: 1 });

    const fallo = await dataSource.getRepository('Fallo').findOneByOrFail({ id: result.insertId });
    expect(fallo.fecha).toBe('1887-05-03');
  });

  it('el índice único rechaza una segunda palabra con la misma clave (RF-11)', async () => {
    await queryRunner.query(
      `INSERT INTO palabras_clave (texto, clave, creadoEn) VALUES ('Daño moral', 'dano moral', NOW(6))`,
    );

    await expect(
      queryRunner.query(
        `INSERT INTO palabras_clave (texto, clave, creadoEn) VALUES ('dano moral', 'dano moral', NOW(6))`,
      ),
    ).rejects.toThrow(/Duplicate entry/);
  });

  it('down elimina las tablas sin tocar las de las specs 001 a 003', async () => {
    // Si hay migraciones posteriores, se deshacen primero, y después la de jurisprudencia.
    const fromJurisprudencia =
      MIGRATIONS.length - MIGRATIONS.indexOf(CrearFallosYPalabrasClave1791589649680);
    for (let index = 0; index < fromJurisprudencia; index++) await dataSource.undoLastMigration();

    for (const table of TABLES) expect(await queryRunner.hasTable(table)).toBe(false);
    for (const table of PREVIOUS_TABLES) expect(await queryRunner.hasTable(table)).toBe(true);
  });
});
