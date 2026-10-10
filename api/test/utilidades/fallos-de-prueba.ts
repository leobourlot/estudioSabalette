import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { toSearchableCaseNumber } from '../../src/causas/validadores/texto-causa.js';
import { FalloPalabraClave } from '../../src/jurisprudencia/fallo-palabra-clave.entity.js';
import { Fallo } from '../../src/jurisprudencia/fallo.entity.js';
import { PalabraClave } from '../../src/jurisprudencia/palabra-clave.entity.js';
import { flexibleKey } from '../../src/jurisprudencia/reglas-jurisprudencia.js';

const RULING_TABLES = ['fallo_palabras_clave', 'palabras_clave', 'fallos'];

/**
 * Vacía las tablas de jurisprudencia. clearTables (aplicacion-de-tests.ts) no las incluye:
 * cada suite de jurisprudencia la llama después de createTestApp, así no quedan fallos de
 * una suite anterior apuntando a ids de usuarios reutilizados.
 */
export async function clearRulingTables(app: NestExpressApplication): Promise<void> {
  const queryRunner = app.get(DataSource).createQueryRunner();
  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of RULING_TABLES) {
      await queryRunner.query(`TRUNCATE TABLE \`${table}\``);
    }
  } finally {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.release();
  }
}

type RulingTestData = Partial<
  Omit<Fallo, 'id' | 'creadoPor' | 'modificadoPor' | 'palabrasClave' | 'numeroBusqueda'>
> & {
  creadoPorId: number;
  /** Textos de las palabras clave; por defecto, "daño moral". */
  palabrasClave?: string[];
};

/** Busca la palabra del catálogo por su clave de comparación flexible, o la crea. */
export async function findOrCreateTestKeyword(
  app: NestExpressApplication,
  texto: string,
): Promise<PalabraClave> {
  const repository = app.get(DataSource).getRepository(PalabraClave);
  const clave = flexibleKey(texto);
  const existing = await repository.findOneBy({ clave });
  return existing ?? repository.save({ texto, clave, creadoEn: new Date() });
}

/**
 * Crea un fallo con sus palabras clave directamente en la base de tests, sin pasar por las
 * reglas del service: sirve para preparar datos, no para probar la carga.
 */
export async function createTestFallo(
  app: NestExpressApplication,
  data: RulingTestData,
): Promise<Fallo> {
  const dataSource = app.get(DataSource);
  const { palabrasClave = ['daño moral'], ...ruling } = data;
  const numero = ruling.numero ?? null;
  const fallo = await dataSource.getRepository(Fallo).save({
    caratula: 'Pérez c/ López s/ daños',
    tribunal: 'CNCiv., Sala A',
    fuero: 'civil',
    fecha: '2019-05-03',
    sumario: 'La responsabilidad del dueño de la cosa es objetiva.',
    enlace: null,
    activo: true,
    creadoEn: new Date(),
    ...ruling,
    numero,
    numeroBusqueda: numero === null ? null : toSearchableCaseNumber(numero),
  });
  for (const texto of palabrasClave) {
    const palabra = await findOrCreateTestKeyword(app, texto);
    await dataSource
      .getRepository(FalloPalabraClave)
      .insert({ falloId: fallo.id, palabraClaveId: palabra.id });
  }
  return fallo;
}

const FUEROS = ['civil', 'penal', 'familia', 'laboral', 'federal', 'otro'] as const;

export interface BulkRulingsOptions {
  count: number;
  creadoPorId: number;
  /** Texto que se repite hasta acercarse al largo máximo del sumario. */
  sumarioFiller: string;
  /** Cantidad de palabras del catálogo; cada fallo lleva tres. */
  keywordCount: number;
}

/**
 * Inserta muchos fallos en bloque, con sus palabras clave, para medir el rendimiento. Todos
 * quedan activos, con fechas repartidas entre 2000 y 2024, los seis fueros y sumarios largos.
 * Devuelve los ids de las palabras del catálogo, en orden.
 */
export async function bulkInsertTestFallos(
  app: NestExpressApplication,
  { count, creadoPorId, sumarioFiller, keywordCount }: BulkRulingsOptions,
): Promise<number[]> {
  const dataSource = app.get(DataSource);
  const creadoEn = new Date();

  await dataSource.getRepository(PalabraClave).insert(
    Array.from({ length: keywordCount }, (_, index) => {
      const texto = `tema de prueba ${index}`;
      return { texto, clave: flexibleKey(texto), creadoEn };
    }),
  );
  const keywordIds = (
    await dataSource
      .getRepository(PalabraClave)
      .find({ select: { id: true }, order: { id: 'ASC' } })
  ).map((palabra) => palabra.id);

  const BATCH = 100;
  for (let start = 0; start < count; start += BATCH) {
    const size = Math.min(BATCH, count - start);
    const result = await dataSource.getRepository(Fallo).insert(
      Array.from({ length: size }, (_, offset) => {
        const index = start + offset;
        const day = String((index % 28) + 1).padStart(2, '0');
        const month = String((index % 12) + 1).padStart(2, '0');
        const numero = `${index}/${2000 + (index % 25)}`;
        return {
          caratula: `Actor ${index} c/ Demandado ${index} s/ daños y perjuicios`,
          tribunal: `Cámara de Apelaciones, Sala ${index % 12}`,
          fuero: FUEROS[index % FUEROS.length],
          fecha: `${2000 + (index % 25)}-${month}-${day}`,
          numero,
          numeroBusqueda: toSearchableCaseNumber(numero),
          sumario: `${sumarioFiller} Fallo número ${index}.`,
          enlace: null,
          activo: true,
          creadoPorId,
          creadoEn,
        };
      }),
    );
    const falloIds = result.identifiers.map((identifier) => identifier.id as number);
    await dataSource.getRepository(FalloPalabraClave).insert(
      falloIds.flatMap((falloId, offset) => {
        const index = start + offset;
        // Tres palabras distintas por fallo.
        return [0, 1, 2].map((step) => ({
          falloId,
          palabraClaveId: keywordIds[(index + step) % keywordIds.length],
        }));
      }),
    );
  }
  return keywordIds;
}
