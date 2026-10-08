import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Causa } from '../src/causas/causa.entity.js';
import { Parte } from '../src/causas/parte.entity.js';
import { Movimiento } from '../src/movimientos/movimiento.entity.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

/**
 * Respuestas indistinguibles, acceso y siguiente acción en el portal (spec 004, RF-1 a RF-3,
 * RF-27 a RF-29).
 */
describe('Portal: respuestas indistinguibles, acceso y siguiente acción', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;
  let lawyer: Usuario;
  let client: Usuario;
  let token: string;
  let causa: Causa;
  let otherOwnCausa: Causa;
  let foreignCausa: Causa;
  let deactivatedCausa: Causa;
  let visible: Movimiento;
  let hidden: Movimiento;
  let fromOtherOwnCausa: Movimiento;

  const NO_CAUSA = { statusCode: 404, message: 'No existe esa causa', error: 'Not Found' };
  const NO_MOVIMIENTO = {
    statusCode: 404,
    message: 'No existe ese movimiento',
    error: 'Not Found',
  };

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    client = await createTestClient(app);
    const other = await createTestClient(app);
    const causaOf = (clienteId: number, activa = true) =>
      createTestCausa(app, {
        activa,
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ clienteId }, { rol: 'demandado', nombre: 'Pedro', apellido: 'López' }],
      });
    causa = await causaOf(client.id);
    otherOwnCausa = await causaOf(client.id);
    foreignCausa = await causaOf(other.id);
    deactivatedCausa = await causaOf(client.id, false);
    const movement = (causaId: number, isVisible = true) =>
      createTestMovimiento(app, { causaId, creadoPorId: lawyer.id, visible: isVisible });
    visible = await movement(causa.id);
    hidden = await movement(causa.id, false);
    fromOtherOwnCausa = await movement(otherOwnCausa.id);
    await movement(foreignCausa.id);
    await movement(deactivatedCausa.id);
    token = (await loginAs(app, client.email!)).accessToken;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  const get = (path: string, accessToken: string | null = token) => {
    const call = request(app.getHttpServer()).get(path);
    return accessToken ? call.set('Cookie', `access_token=${accessToken}`) : call;
  };

  /** Las tres rutas que dependen de una causa, con un movimiento que sí es de esa causa. */
  const causaRoutes = (causaId: number | string, movimientoId: number) => [
    `/api/portal/causas/${causaId}`,
    `/api/portal/causas/${causaId}/movimientos`,
    `/api/portal/causas/${causaId}/movimientos/${movimientoId}`,
  ];

  describe('respuestas indistinguibles', () => {
    it('una causa ajena, desactivada, inexistente o con un id inválido recibe el mismo 404 en cada ruta (RF-28)', async () => {
      const cases: [string, number | string][] = [
        ['ajena', foreignCausa.id],
        ['desactivada', deactivatedCausa.id],
        ['inexistente', 999999],
        ['mal formada', 'abc'],
      ];
      const bodies = new Set<string>();

      for (const [, causaId] of cases) {
        for (const path of causaRoutes(causaId, visible.id)) {
          const response = await get(path).expect(404);
          expect(response.body).toEqual(NO_CAUSA);
          bodies.add(response.text);
        }
      }

      // Byte a byte, la misma respuesta en los doce pedidos.
      expect(bodies.size).toBe(1);
    });

    it('un movimiento oculto, inexistente, de otra causa del cliente o con un id inválido recibe el mismo 404 (RF-29)', async () => {
      const bodies = new Set<string>();

      for (const movimientoId of [hidden.id, 999999, fromOtherOwnCausa.id, 'abc']) {
        const response = await get(
          `/api/portal/causas/${causa.id}/movimientos/${movimientoId}`,
        ).expect(404);
        expect(response.body).toEqual(NO_MOVIMIENTO);
        bodies.add(response.text);
      }

      expect(bodies.size).toBe(1);
      // El mismo movimiento, pedido dentro de su causa, sí se ve.
      await get(
        `/api/portal/causas/${otherOwnCausa.id}/movimientos/${fromOtherOwnCausa.id}`,
      ).expect(200);
    });
  });

  describe('acceso (RF-1, RF-2)', () => {
    const routes = () => ['/api/portal/causas', ...causaRoutes(causa.id, visible.id)];

    it('un visitante recibe 401 en cada ruta', async () => {
      for (const path of routes()) await get(path, null).expect(401);
    });

    it.each(['admin', 'abogado'] as const)(
      'un integrante con rol %s recibe 403 en cada ruta',
      async (rol) => {
        const member = await createTestUser(app, { rol, email: `${rol}.portal@estudio.com` });
        const { accessToken } = await loginAs(app, member.email!);

        for (const path of routes()) await get(path, accessToken).expect(403);
      },
    );

    it('un cliente con el cambio de contraseña pendiente recibe 403 en cada ruta', async () => {
      const pending = await createTestClient(app);
      await dataSource.getRepository(Usuario).update(pending.id, { debeCambiarContrasena: true });
      await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ clienteId: pending.id }],
      });
      const { accessToken } = await loginAs(app, pending.email!);

      for (const path of routes()) await get(path, accessToken).expect(403);
    });

    it('el portal es solo de consulta: POST y PATCH no existen', async () => {
      for (const path of routes()) {
        await request(app.getHttpServer())
          .post(path)
          .set('Cookie', `access_token=${token}`)
          .send({})
          .expect(404);
        await request(app.getHttpServer())
          .patch(path)
          .set('Cookie', `access_token=${token}`)
          .send({})
          .expect(404);
      }
    });
  });

  describe('siguiente acción (RF-3)', () => {
    it('cada cambio rige desde la siguiente petición, con la misma sesión', async () => {
      const fresh = await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ clienteId: client.id }],
      });
      const shown = await createTestMovimiento(app, {
        causaId: fresh.id,
        creadoPorId: lawyer.id,
        visible: true,
      });
      const parties = dataSource.getRepository(Parte);
      const path = `/api/portal/causas/${fresh.id}`;

      expect((await get(path).expect(200)).body.responsable).not.toBeNull();
      await get(`${path}/movimientos/${shown.id}`).expect(200);

      // Ocultar el movimiento.
      await dataSource.getRepository(Movimiento).update(shown.id, { visible: false });
      await get(`${path}/movimientos/${shown.id}`).expect(404);
      expect((await get(`${path}/movimientos`).expect(200)).body.items).toEqual([]);

      // Desactivar al responsable.
      await dataSource.getRepository(Usuario).update(lawyer.id, { activo: false });
      expect((await get(path).expect(200)).body.responsable).toBeNull();
      await dataSource.getRepository(Usuario).update(lawyer.id, { activo: true });

      // Desactivar la causa, y reactivarla.
      await dataSource.getRepository(Causa).update(fresh.id, { activa: false });
      await get(path).expect(404);
      await dataSource.getRepository(Causa).update(fresh.id, { activa: true });
      await get(path).expect(200);

      // Desvincular al cliente.
      await parties.update({ causaId: fresh.id, clienteId: client.id }, { vigente: false });
      await get(path).expect(404);
      const ids = (await get('/api/portal/causas').expect(200)).body.items.map(
        (item: { id: number }) => item.id,
      );
      expect(ids).not.toContain(fresh.id);
    });
  });
});
