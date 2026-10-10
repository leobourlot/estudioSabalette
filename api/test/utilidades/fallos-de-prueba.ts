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
