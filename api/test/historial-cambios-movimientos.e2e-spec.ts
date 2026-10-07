import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CambioMovimiento } from '../src/movimientos/cambio-movimiento.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

/** RF-20 a RF-22: el historial de cambios registra cada acción y nunca se modifica. */
describe('historial de cambios de un movimiento', () => {
  let app: NestExpressApplication;
  let ana: Usuario;
  let luis: Usuario;
  let anaSession: TestSession;
  let luisSession: TestSession;
  let causaId: number;

  const call = (method: 'post' | 'patch' | 'get', path: string, as: TestSession) =>
    request(app.getHttpServer())
      [method](`/api/panel/causas/${causaId}/movimientos${path}`)
      .set('Cookie', `access_token=${as.accessToken}`);

  /** Las filas de movimiento_cambios, tal como están en la base. */
  const storedChanges = (movimientoId: number) =>
    app
      .get(DataSource)
      .getRepository(CambioMovimiento)
      .find({
        where: { movimientoId },
        order: { id: 'ASC' },
      });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearMovementTables(app);
    ana = await createTestUser(app, {
      email: 'ana@estudio.com',
      nombre: 'Ana',
      apellido: 'Sabalette',
      rol: 'admin',
    });
    luis = await createTestUser(app, {
      email: 'luis@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    anaSession = await loginAs(app, ana.email!);
    luisSession = await loginAs(app, luis.email!);
    causaId = (await createTestCausa(app, { responsableId: luis.id, creadoPorId: luis.id })).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registra carga, modificación, visibilidad, anulación y restauración, y nunca altera lo anterior', async () => {
    const created = await call('post', '', luisSession)
      .send({ fecha: '2024-03-01', tipo: 'providencia', descripcion: 'Se fija audiencia.' })
      .expect(201);
    const id: number = created.body.id;

    const steps: [string, () => request.Test][] = [
      [
        'modificación',
        () =>
          call('patch', `/${id}`, anaSession).send({
            descripcion: 'Se fija audiencia para el 12/11.',
          }),
      ],
      ['visibilidad', () => call('patch', `/${id}`, luisSession).send({ visible: true })],
      ['anulación', () => call('post', `/${id}/anular`, anaSession)],
      ['restauración', () => call('post', `/${id}/restaurar`, luisSession)],
    ];

    for (const [name, step] of steps) {
      const before = await storedChanges(id);
      await step().expect(200);
      const after = await storedChanges(id);

      // RF-21: se agregó exactamente un cambio y los anteriores siguen idénticos.
      expect(after, name).toHaveLength(before.length + 1);
      expect(after.slice(0, before.length), name).toEqual(before);
    }

    const detail = await call('get', `/${id}`, anaSession).expect(200);
    const summary = detail.body.cambios.map(
      (cambio: { accion: string; usuario: { id: number }; cambios: unknown[] }) => [
        cambio.accion,
        cambio.usuario.id,
        cambio.cambios,
      ],
    );

    // RF-22: del más reciente al más antiguo, con autor y valores anterior y nuevo.
    expect(summary).toEqual([
      ['restauracion', luis.id, [{ campo: 'anulado', anterior: true, nuevo: false }]],
      ['anulacion', ana.id, [{ campo: 'anulado', anterior: false, nuevo: true }]],
      ['modificacion', luis.id, [{ campo: 'visible', anterior: false, nuevo: true }]],
      [
        'modificacion',
        ana.id,
        [
          {
            campo: 'descripcion',
            anterior: 'Se fija audiencia.',
            nuevo: 'Se fija audiencia para el 12/11.',
          },
        ],
      ],
      [
        'carga',
        luis.id,
        expect.arrayContaining([{ campo: 'fecha', anterior: null, nuevo: '2024-03-01' }]),
      ],
    ]);

    const times = detail.body.cambios.map((cambio: { fechaHora: string }) =>
      new Date(cambio.fechaHora).getTime(),
    );
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(detail.body.modificadoPor).toMatchObject({ id: luis.id });
  });
});
