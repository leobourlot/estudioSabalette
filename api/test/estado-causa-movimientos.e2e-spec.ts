import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Causa, type EstadoCausa } from '../src/causas/causa.entity.js';
import { CambioMovimiento } from '../src/movimientos/cambio-movimiento.entity.js';
import { Movimiento } from '../src/movimientos/movimiento.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const NEW_MOVEMENT = {
  fecha: '2024-03-01',
  tipo: 'providencia',
  descripcion: 'Se fija audiencia preliminar.',
};

/** RF-10, RF-15, RF-28, RF-29: estado de la causa y escrituras simultáneas. */
describe('movimientos según el estado de la causa', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;

  const withSession = (call: request.Test) =>
    call.set('Cookie', `access_token=${session.accessToken}`);
  const server = () => request(app.getHttpServer());
  const movements = (causaId: number) => `/api/panel/causas/${causaId}/movimientos`;

  /** Las cuatro escrituras sobre movimientos. */
  const writes = (causaId: number, movimientoId: number) => ({
    cargar: () => withSession(server().post(movements(causaId))).send(NEW_MOVEMENT),
    modificar: () =>
      withSession(server().patch(`${movements(causaId)}/${movimientoId}`)).send({ visible: true }),
    anular: () => withSession(server().post(`${movements(causaId)}/${movimientoId}/anular`)),
    restaurar: () => withSession(server().post(`${movements(causaId)}/${movimientoId}/restaurar`)),
  });

  const newCausa = (data: { activa?: boolean; estado?: EstadoCausa } = {}) =>
    createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id, ...data });

  const newMovement = (causaId: number, anulado = false) =>
    createTestMovimiento(app, { causaId, creadoPorId: lawyer.id, anulado });

  const causaRow = (id: number) => app.get(DataSource).getRepository(Causa).findOneByOrFail({ id });

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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('cargar, modificar, anular y restaurar no cambian la auditoría de la causa (RF-10)', async () => {
    const causa = await newCausa();
    const before = await causaRow(causa.id);
    const movimiento = await newMovement(causa.id);
    const write = writes(causa.id, movimiento.id);

    await write.cargar().expect(201);
    await write.modificar().expect(200);
    await write.anular().expect(200);
    await write.restaurar().expect(200);

    const after = await causaRow(causa.id);
    expect(after.modificadoPorId).toBe(before.modificadoPorId);
    expect(after.modificadoEn).toEqual(before.modificadoEn);
  });

  describe('causa desactivada (RF-28)', () => {
    it.each(['cargar', 'modificar', 'anular', 'restaurar'] as const)(
      'rechaza %s un movimiento',
      async (name) => {
        const causa = await newCausa({ activa: false });
        const movimiento = await newMovement(causa.id, name === 'restaurar');

        const response = await writes(causa.id, movimiento.id)[name]().expect(409);

        expect(response.body.message).toBe('La causa está desactivada');
        const stored = await app
          .get(DataSource)
          .getRepository(Movimiento)
          .findBy({ causaId: causa.id });
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({ visible: false, anulado: name === 'restaurar' });
      },
    );

    it('permite consultar sus movimientos', async () => {
      const causa = await newCausa({ activa: false });
      const movimiento = await newMovement(causa.id);

      const response = await withSession(
        server().get(`${movements(causa.id)}/${movimiento.id}`),
      ).expect(200);
      expect(response.body.causaActiva).toBe(false);
    });
  });

  it.each(['archivada', 'finalizada'] as const)(
    'en una causa %s se siguen gestionando los movimientos (RF-29)',
    async (estado) => {
      const causa = await newCausa({ estado });
      const movimiento = await newMovement(causa.id);
      const write = writes(causa.id, movimiento.id);

      await write.cargar().expect(201);
      await write.modificar().expect(200);
      await write.anular().expect(200);
      await write.restaurar().expect(200);
    },
  );

  describe('escrituras simultáneas', () => {
    it('una anulación y una modificación simultáneas se ejecutan de a una (RF-15)', async () => {
      for (let round = 0; round < 5; round++) {
        const causa = await newCausa();
        const movimiento = await newMovement(causa.id);
        const write = writes(causa.id, movimiento.id);

        const [annul, update] = await Promise.all([write.anular(), write.modificar()]);

        expect(annul.status).toBe(200);
        expect([200, 409]).toContain(update.status);
        const changes = await app
          .get(DataSource)
          .getRepository(CambioMovimiento)
          .find({ where: { movimientoId: movimiento.id }, order: { id: 'ASC' } });
        const actions = changes.map((change) => change.accion);
        if (update.status === 409) {
          // La anulación quedó primero: la modificación vio el movimiento anulado.
          expect(update.body.message).toBe(
            'El movimiento está anulado. Restauralo para modificarlo',
          );
          expect(actions).toEqual(['carga', 'anulacion']);
        } else {
          // La modificación quedó primero y la anulación después; nunca se modifica un anulado.
          expect(actions).toEqual(['carga', 'modificacion', 'anulacion']);
        }
      }
    });

    it('una desactivación de la causa y una carga simultáneas se ejecutan de a una (RF-28)', async () => {
      for (let round = 0; round < 5; round++) {
        const causa = await newCausa();

        const [deactivation, load] = await Promise.all([
          withSession(server().post(`/api/panel/causas/${causa.id}/desactivar`)),
          writes(causa.id, 0).cargar(),
        ]);

        expect(deactivation.status).toBe(204);
        expect([201, 409]).toContain(load.status);
        const stored = await app
          .get(DataSource)
          .getRepository(Movimiento)
          .findBy({ causaId: causa.id });
        if (load.status === 409) {
          // La desactivación quedó primero: no se cargó nada.
          expect(load.body.message).toBe('La causa está desactivada');
          expect(stored).toHaveLength(0);
        } else {
          expect(stored).toHaveLength(1);
        }
      }
    });
  });
});
