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
