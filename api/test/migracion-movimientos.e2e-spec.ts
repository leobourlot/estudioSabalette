import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

const TABLES = ['movimientos', 'movimiento_cambios'];
const PREVIOUS_TABLES = [
  'usuarios',
  'clientes',
  'sesiones',
  'causas',
  'partes',
  'causa_colaboradores',
];

/** Plan 003, "Entidades de TypeORM y migración": migración de movimientos y su historial. */
describe('migración de movimientos', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let userId: number;
  let causaId: number;

  beforeAll(async () => {
    dataSource = new DataSource({
      ...buildDataSourceOptions(loadTestEnvironment()),
      entities: ENTITIES,
      migrations: MIGRATIONS,
    });
    await dataSource.initialize();
    // Parte de una base de tests vacía y aplica todas las migraciones, incluidas las de las
    // specs 001 y 002.
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
    queryRunner = dataSource.createQueryRunner();

    const user: { insertId: number } = await queryRunner.query(
      `INSERT INTO usuarios (rol, nombre, apellido, contrasenaHash) VALUES ('admin', 'Ana', 'Sabalette', 'x')`,
    );
    userId = user.insertId;
    const causa: { insertId: number } = await queryRunner.query(
      `INSERT INTO causas (caratula, fuero, responsableId, creadoPorId) VALUES ('Pérez c/ Gómez', 'civil', ?, ?)`,
      [userId, userId],
    );
    causaId = causa.insertId;
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

  it('up crea los índices del historial', async () => {
    const indexes: { name: string; columna: string }[] = await queryRunner.query(
      `SELECT INDEX_NAME AS name, COLUMN_NAME AS columna FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?) AND INDEX_NAME LIKE 'IDX_%'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [TABLES],
    );

    expect(indexes.map((index) => `${index.name}.${index.columna}`)).toEqual([
      'IDX_movimiento_cambios_movimiento.movimientoId',
      'IDX_movimiento_cambios_movimiento.id',
      'IDX_movimientos_historial.causaId',
      'IDX_movimientos_historial.fecha',
      'IDX_movimientos_historial.creadoEn',
      'IDX_movimientos_historial.id',
    ]);
  });

  it('up crea las claves foráneas a causas, movimientos y usuarios', async () => {
    const foreignKeys: { columna: string; referencia: string }[] = await queryRunner.query(
      `SELECT CONCAT(TABLE_NAME, '.', COLUMN_NAME) AS columna,
              CONCAT(REFERENCED_TABLE_NAME, '.', REFERENCED_COLUMN_NAME) AS referencia
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?) AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [TABLES],
    );

    expect(foreignKeys.map((fk) => `${fk.columna} -> ${fk.referencia}`).sort()).toEqual([
      'movimiento_cambios.movimientoId -> movimientos.id',
      'movimiento_cambios.usuarioId -> usuarios.id',
      'movimientos.causaId -> causas.id',
      'movimientos.creadoPorId -> usuarios.id',
      'movimientos.modificadoPorId -> usuarios.id',
    ]);
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('guarda la fecha como día y la lee como el mismo texto AAAA-MM-DD (RNF de fechas)', async () => {
    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO movimientos (causaId, fecha, tipo, descripcion, creadoPorId, creadoEn)
       VALUES (?, '2024-03-01', 'providencia', 'Se fija audiencia.', ?, NOW(6))`,
      [causaId, userId],
    );

    const [raw]: { fecha: unknown; visible: number; anulado: number }[] = await queryRunner.query(
      'SELECT fecha, visible, anulado FROM movimientos WHERE id = ?',
      [result.insertId],
    );
    expect(raw).toEqual({ fecha: '2024-03-01', visible: 0, anulado: 0 });

    const movimiento = await dataSource.getRepository('Movimiento').findOneByOrFail({
      id: result.insertId,
    });
    expect(movimiento.fecha).toBe('2024-03-01');
  });

  it('guarda los cambios en JSON', async () => {
    const [movimiento]: { id: number }[] = await queryRunner.query(
      'SELECT id FROM movimientos LIMIT 1',
    );
    const cambios = [{ campo: 'visible', anterior: false, nuevo: true }];
    await queryRunner.query(
      `INSERT INTO movimiento_cambios (movimientoId, accion, usuarioId, fechaHora, cambios)
       VALUES (?, 'modificacion', ?, NOW(6), ?)`,
      [movimiento.id, userId, JSON.stringify(cambios)],
    );

    const cambio = await dataSource
      .getRepository('CambioMovimiento')
      .findOneByOrFail({ movimientoId: movimiento.id });
    expect(cambio.cambios).toEqual(cambios);
  });

  it('down elimina las tablas sin tocar las de las specs 001 y 002', async () => {
    await dataSource.undoLastMigration();

    for (const table of TABLES) expect(await queryRunner.hasTable(table)).toBe(false);
    for (const table of PREVIOUS_TABLES) expect(await queryRunner.hasTable(table)).toBe(true);
  });
});
