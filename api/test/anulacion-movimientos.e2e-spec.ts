import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

/** RF-2, RF-16 a RF-20: anulación y restauración. */
describe('anulación y restauración de movimientos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let causaId: number;

  const action = (movimientoId: number, name: 'anular' | 'restaurar') =>
    request(app.getHttpServer())
      .post(`/api/panel/causas/${causaId}/movimientos/${movimientoId}/${name}`)
      .set('Cookie', `access_token=${session.accessToken}`);

  const newMovement = (data: { visible?: boolean; anulado?: boolean } = {}) =>
    createTestMovimiento(app, {
      causaId,
      creadoPorId: lawyer.id,
      textoCliente: 'El juez fijó audiencia.',
      ...data,
    });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    session = await loginAs(app, lawyer.email!);
    causaId = (await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id })).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ['visible', true],
    ['oculto', false],
  ])(
    'anula un movimiento %s y conserva sus datos y su visibilidad (RF-16, RF-17)',
    async (_case, visible) => {
      const movimiento = await newMovement({ visible });

      const response = await action(movimiento.id, 'anular').expect(200);

      expect(response.body).toMatchObject({
        anulado: true,
        visible,
        fecha: movimiento.fecha,
        tipo: movimiento.tipo,
        descripcion: movimiento.descripcion,
        textoCliente: 'El juez fijó audiencia.',
        modificadoPor: { id: lawyer.id },
      });
      expect(response.body.modificadoEn).not.toBeNull();
      expect(response.body.cambios[0]).toMatchObject({
        accion: 'anulacion',
        usuario: { id: lawyer.id },
        cambios: [{ campo: 'anulado', anterior: false, nuevo: true }],
      });
    },
  );

  it('restaura un movimiento anulado con la visibilidad que tenía (RF-18)', async () => {
    const movimiento = await newMovement({ visible: true, anulado: true });

    const response = await action(movimiento.id, 'restaurar').expect(200);

    expect(response.body).toMatchObject({
      anulado: false,
      visible: true,
      modificadoPor: { id: lawyer.id },
    });
    expect(response.body.cambios[0]).toMatchObject({
      accion: 'restauracion',
      cambios: [{ campo: 'anulado', anterior: true, nuevo: false }],
    });
  });

  it('rechaza anular un movimiento ya anulado (RF-19)', async () => {
    const movimiento = await newMovement({ anulado: true });

    const response = await action(movimiento.id, 'anular').expect(409);

    expect(response.body.message).toBe('El movimiento ya está anulado');
  });

  it('rechaza restaurar un movimiento que no está anulado (RF-19)', async () => {
    const movimiento = await newMovement();

    const response = await action(movimiento.id, 'restaurar').expect(409);

    expect(response.body.message).toBe('El movimiento no está anulado');
  });

  it('un movimiento restaurado se puede volver a modificar', async () => {
    const movimiento = await newMovement({ anulado: true });
    await action(movimiento.id, 'restaurar').expect(200);

    await request(app.getHttpServer())
      .patch(`/api/panel/causas/${causaId}/movimientos/${movimiento.id}`)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send({ visible: true })
      .expect(200);
  });

  it('responde 404 con un movimiento inexistente', async () => {
    const response = await action(999999, 'anular').expect(404);
    expect(response.body.message).toBe('No existe ese movimiento');
  });
});
