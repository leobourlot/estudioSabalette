import type { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { CambioMovimiento } from '../../src/movimientos/cambio-movimiento.entity.js';
import { Movimiento } from '../../src/movimientos/movimiento.entity.js';
import { loadChanges } from '../../src/movimientos/reglas-movimientos.js';

const MOVEMENT_TABLES = ['movimiento_cambios', 'movimientos'];

/**
 * Vacía las tablas de movimientos. clearTables (aplicacion-de-tests.ts) no las incluye: cada
 * suite de movimientos la llama después de createTestApp, así no quedan movimientos de una
 * suite anterior apuntando a ids de causas reutilizados.
 */
export async function clearMovementTables(app: NestExpressApplication): Promise<void> {
  const queryRunner = app.get(DataSource).createQueryRunner();
  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of MOVEMENT_TABLES) {
      await queryRunner.query(`TRUNCATE TABLE \`${table}\``);
    }
  } finally {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    await queryRunner.release();
  }
}

type MovementTestData = Partial<
  Omit<Movimiento, 'id' | 'causa' | 'creadoPor' | 'modificadoPor' | 'cambios'>
> & {
  causaId: number;
  creadoPorId: number;
};

/**
 * Crea un movimiento con su cambio de carga directamente en la base de tests, sin pasar por
 * las reglas del service: sirve para preparar datos, no para probar la carga.
 */
export async function createTestMovimiento(
  app: NestExpressApplication,
  data: MovementTestData,
): Promise<Movimiento> {
  const dataSource = app.get(DataSource);
  const movimiento = await dataSource.getRepository(Movimiento).save({
    fecha: '2024-03-01',
    tipo: 'providencia',
    descripcion: 'Se fija audiencia preliminar.',
    textoCliente: null,
    visible: false,
    anulado: false,
    creadoEn: new Date(),
    ...data,
  });
  await dataSource.getRepository(CambioMovimiento).insert({
    movimientoId: movimiento.id,
    accion: 'carga',
    usuarioId: movimiento.creadoPorId,
    fechaHora: movimiento.creadoEn,
    cambios: loadChanges(movimiento),
  });
  return movimiento;
}
