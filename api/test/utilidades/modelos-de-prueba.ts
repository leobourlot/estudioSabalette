import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { ModeloEscrito } from '../../src/modelos-escritos/modelo-escrito.entity.js';

/**
 * Vacía la tabla de modelos de escritos. clearTables (aplicacion-de-tests.ts) no la incluye:
 * cada suite de modelos la llama después de createTestApp, así no quedan modelos de una suite
 * anterior apuntando a ids de usuarios reutilizados.
 */
export async function clearModelTables(app: NestExpressApplication): Promise<void> {
  const queryRunner = app.get(DataSource).createQueryRunner();
  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.query('TRUNCATE TABLE `modelos_escritos`');
  } finally {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.release();
  }
}

const TIPOS = ['demanda', 'contestacion_demanda', 'escrito_tramite', 'recurso', 'oficio'] as const;
const FUEROS = ['civil', 'penal', 'familia', 'laboral', 'federal', 'otro'] as const;

export interface BulkModelsOptions {
  count: number;
  creadoPorId: number;
  /** Texto de cada modelo, sin su número: se usa cerca del largo máximo. */
  textFiller: string;
}

/**
 * Inserta muchos modelos en bloque, para medir el rendimiento. Todos quedan activos, con los
 * tipos y los fueros repartidos, y con el mismo texto largo más su número.
 */
export async function bulkInsertTestModelos(
  app: NestExpressApplication,
  { count, creadoPorId, textFiller }: BulkModelsOptions,
): Promise<void> {
  const repository = app.get(DataSource).getRepository(ModeloEscrito);
  const creadoEn = new Date();
  // Lotes chicos: cada modelo pesa unos 50 KB.
  const BATCH = 20;
  for (let start = 0; start < count; start += BATCH) {
    const size = Math.min(BATCH, count - start);
    await repository.insert(
      Array.from({ length: size }, (_, offset) => {
        const index = start + offset;
        return {
          titulo: `Modelo de prueba ${String(index).padStart(4, '0')}`,
          tipo: TIPOS[index % TIPOS.length],
          fuero: FUEROS[index % FUEROS.length],
          descripcion: `Descripción del modelo ${index}`,
          texto: `${textFiller}\nModelo número ${index}.`,
          activo: true,
          creadoPorId,
          creadoEn,
        };
      }),
    );
  }
}

type ModelTestData = Partial<Omit<ModeloEscrito, 'id' | 'creadoPor' | 'modificadoPor'>> & {
  creadoPorId: number;
};

/**
 * Crea un modelo directamente en la base de tests, sin pasar por las reglas del service: sirve
 * para preparar datos, no para probar la carga.
 */
export function createTestModelo(
  app: NestExpressApplication,
  data: ModelTestData,
): Promise<ModeloEscrito> {
  return app
    .get(DataSource)
    .getRepository(ModeloEscrito)
    .save({
      titulo: 'Oficio al Registro de la Propiedad',
      tipo: 'oficio',
      fuero: 'otro',
      descripcion: null,
      texto: 'Señor Director:\n\nEn los autos "#CARATULA#", Expte. Nº #NUMERO_EXPEDIENTE#.',
      activo: true,
      creadoEn: new Date(),
      ...data,
    });
}
