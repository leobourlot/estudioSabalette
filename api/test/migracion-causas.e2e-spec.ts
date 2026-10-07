import { DataSource, QueryFailedError, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { CrearCausasPartesYColaboradores1791156117399 } from '../src/migraciones/1791156117399-crear-causas-partes-y-colaboradores.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

const TABLES = ['causas', 'partes', 'causa_colaboradores'];
const SPEC_001_TABLES = ['usuarios', 'clientes', 'sesiones'];

interface CaseRow {
  numeroExpediente?: string | null;
  juzgado?: string | null;
  fuero?: string;
  activa?: boolean;
  esIncidente?: boolean;
}

/** Plan 002, "Expediente duplicado": migración de causas, partes y colaboradores. */
describe('migración de causas', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let userId: number;

  /** Inserta una causa directamente en la base y devuelve su claveExpediente. */
  async function insertCase(row: CaseRow): Promise<string | null> {
    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO causas (caratula, numeroExpediente, juzgado, fuero, activa, esIncidente, responsableId, creadoPorId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Pérez c/ Gómez s/ daños',
        row.numeroExpediente === undefined ? '1234/2024' : row.numeroExpediente,
        row.juzgado === undefined ? 'Juzgado Civil N° 3' : row.juzgado,
        row.fuero ?? 'civil',
        row.activa ?? true,
        row.esIncidente ?? false,
        userId,
        userId,
      ],
    );
    const [inserted]: { claveExpediente: string | null }[] = await queryRunner.query(
      'SELECT claveExpediente FROM causas WHERE id = ?',
      [result.insertId],
    );
    return inserted.claveExpediente;
  }

  beforeAll(async () => {
    dataSource = new DataSource({
      ...buildDataSourceOptions(loadTestEnvironment()),
      entities: ENTITIES,
      migrations: MIGRATIONS,
    });
    await dataSource.initialize();
    // Parte de una base de tests vacía y aplica todas las migraciones, incluida la de la spec 001.
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
    queryRunner = dataSource.createQueryRunner();

    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO usuarios (rol, nombre, apellido, contrasenaHash) VALUES ('admin', 'Ana', 'Sabalette', 'x')`,
    );
    userId = result.insertId;
  });

  afterAll(async () => {
    await queryRunner?.release();
    await dataSource?.destroy();
  });

  it('up crea las tablas con la intercalación de la spec 001', async () => {
    const tables: { name: string; collation: string }[] = await queryRunner.query(
      `SELECT TABLE_NAME AS name, TABLE_COLLATION AS collation FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
      [TABLES],
    );

    expect(tables.map((table) => table.name).sort()).toEqual([...TABLES].sort());
    for (const table of tables) expect(table.collation).toBe('utf8mb4_unicode_ci');
  });

  it('up crea las claves foráneas a causas, clientes y usuarios', async () => {
    const foreignKeys: { columna: string; referencia: string }[] = await queryRunner.query(
      `SELECT CONCAT(TABLE_NAME, '.', COLUMN_NAME) AS columna,
              CONCAT(REFERENCED_TABLE_NAME, '.', REFERENCED_COLUMN_NAME) AS referencia
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?) AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [TABLES],
    );

    expect(foreignKeys.map((fk) => `${fk.columna} -> ${fk.referencia}`).sort()).toEqual([
      'causa_colaboradores.causaId -> causas.id',
      'causa_colaboradores.usuarioId -> usuarios.id',
      'causas.creadoPorId -> usuarios.id',
      'causas.desactivadaPorId -> usuarios.id',
      'causas.modificadoPorId -> usuarios.id',
      'causas.reactivadaPorId -> usuarios.id',
      'causas.responsableId -> usuarios.id',
      'partes.causaId -> causas.id',
      'partes.clienteId -> clientes.usuarioId',
      'partes.creadoPorId -> usuarios.id',
      'partes.modificadoPorId -> usuarios.id',
    ]);
  });

  it('deja el esquema igual a las entidades, incluida la columna generada', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('calcula la clave de una causa activa no incidente con número y juzgado (RF-8)', async () => {
    expect(await insertCase({ numeroExpediente: '1/2020', juzgado: 'Juzgado Laboral N° 1' })).toBe(
      'civil|Juzgado Laboral N° 1|1/2020',
    );
  });

  it.each<[string, CaseRow]>([
    ['desactivada', { activa: false }],
    ['incidente', { esIncidente: true }],
    ['sin número', { numeroExpediente: null }],
    ['sin juzgado', { juzgado: null }],
  ])('deja la clave en NULL en una causa %s (RF-8 a RF-10)', async (_case, row) => {
    expect(await insertCase(row)).toBeNull();
  });

  it('rechaza dos causas activas con la misma clave, aunque cambien mayúsculas y tildes (RF-8)', async () => {
    await insertCase({ numeroExpediente: 'A-55/2024', juzgado: 'Juzgado Civil N° 3' });

    await expect(
      insertCase({ numeroExpediente: 'a-55/2024', juzgado: 'juzgado civíl n° 3' }),
    ).rejects.toThrow(QueryFailedError);
    await expect(
      insertCase({ numeroExpediente: 'A-55/2024', juzgado: 'Juzgado Civil N° 3' }),
    ).rejects.toThrow(/UQ_causas_expediente_activo/);
  });

  it('admite el mismo número en otro fuero, en un incidente o con separadores distintos (RF-8, RF-10)', async () => {
    await insertCase({ numeroExpediente: '77/2024', juzgado: 'Juzgado Civil N° 3' });

    await expect(
      insertCase({ numeroExpediente: '77/2024', juzgado: 'Juzgado Civil N° 3', fuero: 'familia' }),
    ).resolves.not.toBeNull();
    await expect(
      insertCase({ numeroExpediente: '77/2024', juzgado: 'Juzgado Civil N° 3', esIncidente: true }),
    ).resolves.toBeNull();
    await expect(
      insertCase({ numeroExpediente: '77-2024', juzgado: 'Juzgado Civil N° 3' }),
    ).resolves.not.toBeNull();
  });

  it('down elimina las tablas y su metadato sin tocar las de la spec 001', async () => {
    // Las migraciones posteriores dependen de causas: se deshacen primero, y después la de causas.
    const fromCausas =
      MIGRATIONS.length - MIGRATIONS.indexOf(CrearCausasPartesYColaboradores1791156117399);
    for (let index = 0; index < fromCausas; index++) await dataSource.undoLastMigration();

    for (const table of TABLES) expect(await queryRunner.hasTable(table)).toBe(false);
    for (const table of SPEC_001_TABLES) expect(await queryRunner.hasTable(table)).toBe(true);
    const metadata: unknown[] = await queryRunner.query(
      `SELECT * FROM typeorm_metadata WHERE \`table\` = 'causas'`,
    );
    expect(metadata).toEqual([]);
  });
});
