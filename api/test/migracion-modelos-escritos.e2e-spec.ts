import { DataSource, type QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENTITIES, MIGRATIONS } from '../src/base-de-datos/esquema.js';
import { buildDataSourceOptions } from '../src/base-de-datos/opciones-base-de-datos.js';
import { CrearModelosEscritos1791689533533 } from '../src/migraciones/1791689533533-crear-modelos-escritos.js';
import { ModeloEscrito } from '../src/modelos-escritos/modelo-escrito.entity.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';

const TABLE = 'modelos_escritos';
const PREVIOUS_TABLES = [
  'usuarios',
  'clientes',
  'sesiones',
  'causas',
  'partes',
  'causa_colaboradores',
  'movimientos',
  'movimiento_cambios',
  'fallos',
  'palabras_clave',
  'fallo_palabras_clave',
];

/** Plan 006, "Entidades de TypeORM y migración": modelos de escritos. */
describe('migración de modelos de escritos', () => {
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
    // specs 001 a 005.
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

  it('up crea la tabla con la intercalación de las specs anteriores', async () => {
    const tables: { name: string; collation: string }[] = await queryRunner.query(
      `SELECT TABLE_NAME AS name, TABLE_COLLATION AS collation FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [TABLE],
    );

    expect(tables).toEqual([{ name: TABLE, collation: 'utf8mb4_unicode_ci' }]);
  });

  it('el texto es mediumtext y el fuero nace como otro', async () => {
    const columns: { name: string; type: string; porDefecto: string | null }[] =
      await queryRunner.query(
        `SELECT COLUMN_NAME AS name, DATA_TYPE AS type, COLUMN_DEFAULT AS porDefecto
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME IN ('texto', 'fuero')
         ORDER BY COLUMN_NAME`,
        [TABLE],
      );

    expect(columns).toEqual([
      { name: 'fuero', type: 'enum', porDefecto: 'otro' },
      { name: 'texto', type: 'mediumtext', porDefecto: null },
    ]);
  });

  it('up crea el índice del listado', async () => {
    const indexes: { name: string; columna: string }[] = await queryRunner.query(
      `SELECT INDEX_NAME AS name, COLUMN_NAME AS columna
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME LIKE 'IDX_%'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [TABLE],
    );

    expect(indexes.map((index) => `${index.name}.${index.columna}`)).toEqual([
      'IDX_modelos_escritos_listado.activo',
      'IDX_modelos_escritos_listado.titulo',
    ]);
  });

  it('up crea las claves foráneas a usuarios', async () => {
    const foreignKeys: { columna: string; referencia: string }[] = await queryRunner.query(
      `SELECT CONCAT(TABLE_NAME, '.', COLUMN_NAME) AS columna,
              CONCAT(REFERENCED_TABLE_NAME, '.', REFERENCED_COLUMN_NAME) AS referencia
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [TABLE],
    );

    expect(foreignKeys.map((fk) => `${fk.columna} -> ${fk.referencia}`).sort()).toEqual([
      'modelos_escritos.creadoPorId -> usuarios.id',
      'modelos_escritos.modificadoPorId -> usuarios.id',
    ]);
  });

  it('deja el esquema igual a las entidades', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });

  it('guarda un texto de 50.000 caracteres con tildes y lo lee igual (RF-1)', async () => {
    // Cada "ñ" ocupa dos bytes: 100.000 bytes no entran en un varchar ni en un text.
    const texto = `Señor Juez:\n\n${'ñ'.repeat(49_979)}\n#FECHA#`;
    expect([...texto]).toHaveLength(50_000);

    const repository = dataSource.getRepository(ModeloEscrito);
    const saved = await repository.save({
      titulo: 'Demanda de daños',
      tipo: 'demanda',
      fuero: 'civil',
      descripcion: null,
      texto,
      creadoPorId: userId,
      creadoEn: new Date(),
    });

    const read = await repository.findOneByOrFail({ id: saved.id });
    expect(read.texto).toBe(texto);
    expect(read).toMatchObject({ activo: true, descripcion: null, modificadoEn: null });
  });

  it('un modelo guardado sin fuero queda con el fuero otro (RF-1)', async () => {
    const result: { insertId: number } = await queryRunner.query(
      `INSERT INTO modelos_escritos (titulo, tipo, texto, creadoPorId, creadoEn)
       VALUES ('Oficio', 'oficio', 'Señor Director:', ?, NOW(6))`,
      [userId],
    );

    const [raw]: { fuero: string; activo: number }[] = await queryRunner.query(
      'SELECT fuero, activo FROM modelos_escritos WHERE id = ?',
      [result.insertId],
    );
    expect(raw).toEqual({ fuero: 'otro', activo: 1 });
  });

  it('rechaza un tipo de escrito que no está en la lista', async () => {
    await expect(
      queryRunner.query(
        `INSERT INTO modelos_escritos (titulo, tipo, texto, creadoPorId, creadoEn)
         VALUES ('Carta', 'carta', 'Texto', ?, NOW(6))`,
        [userId],
      ),
    ).rejects.toThrow();
  });

  it('down elimina la tabla sin tocar las de las specs 001 a 005', async () => {
    // Si hay migraciones posteriores, se deshacen primero, y después la de modelos.
    const fromModelos = MIGRATIONS.length - MIGRATIONS.indexOf(CrearModelosEscritos1791689533533);
    for (let index = 0; index < fromModelos; index++) await dataSource.undoLastMigration();

    expect(await queryRunner.hasTable(TABLE)).toBe(false);
    for (const table of PREVIOUS_TABLES) expect(await queryRunner.hasTable(table)).toBe(true);
  });
});
