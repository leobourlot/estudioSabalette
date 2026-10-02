import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const USERS = '/api/panel/usuarios';
const PRINCIPAL_MESSAGE = 'No se puede modificar al administrador principal';
const TRANSFER_TARGET_MESSAGE = 'Solo se puede transferir a otro administrador activo';

describe('administrador principal (RF-31, RF-32)', () => {
  let app: NestExpressApplication;
  let principal: Usuario;
  let adminA: Usuario;
  let adminB: Usuario;
  let lawyer: Usuario;
  let principalSession: TestSession;
  let adminASession: TestSession;
  let adminBSession: TestSession;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
    principal = await createTestUser(app, {
      rol: 'admin',
      esPrincipal: true,
      email: 'principal@estudio.com',
      nombre: 'Carla',
    });
    adminA = await createTestUser(app, {
      rol: 'admin',
      email: 'mario@estudio.com',
      nombre: 'Mario',
    });
    adminB = await createTestUser(app, {
      rol: 'admin',
      email: 'lucia@estudio.com',
      nombre: 'Lucía',
    });
    lawyer = await createTestUser(app, { email: 'juan@estudio.com' });
    principalSession = await loginAs(app, 'principal@estudio.com');
    adminASession = await loginAs(app, 'mario@estudio.com');
    adminBSession = await loginAs(app, 'lucia@estudio.com');
  }, 60_000);

  const server = () => app.getHttpServer();
  const withAccess = (call: request.Test, session: TestSession) =>
    call.set('Cookie', `access_token=${session.accessToken}`);
  const post = (session: TestSession, path: string, body: object = {}) =>
    withAccess(request(server()).post(`${USERS}${path}`), session).send(body);
  const patch = (session: TestSession, id: number, body: object) =>
    withAccess(request(server()).patch(`${USERS}/${id}`), session).send(body);
  const transfer = (session: TestSession, id: number) =>
    post(session, `/${id}/transferir-principal`);
  const principalIds = async () =>
    (await app.get(DataSource).getRepository(Usuario).findBy({ esPrincipal: true })).map(
      (u) => u.id,
    );

  describe('protecciones', () => {
    it.each([
      ['quitarle el rol', () => patch(adminASession, principal.id, { rol: 'abogado' })],
      ['desactivarlo', () => post(adminASession, `/${principal.id}/desactivar`)],
      [
        'cambiarle el email',
        () => patch(adminASession, principal.id, { email: 'otro@estudio.com' }),
      ],
      [
        'restablecerle la contraseña',
        () =>
          post(adminASession, `/${principal.id}/restablecer-contrasena`, {
            contrasenaTemporal: 'clave temporal 2026',
          }),
      ],
    ])('otro administrador no puede %s', async (_case, action) => {
      const response = await action();

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(PRINCIPAL_MESSAGE);
    });

    it('el principal no puede quitarse el rol ni desactivarse', async () => {
      const role = await patch(principalSession, principal.id, { rol: 'abogado' });
      expect(role.status).toBe(409);
      expect(role.body.message).toBe(PRINCIPAL_MESSAGE);

      const deactivation = await post(principalSession, `/${principal.id}/desactivar`);
      expect(deactivation.status).toBe(409);
      expect(deactivation.body.message).toBe(PRINCIPAL_MESSAGE);
    });

    it('sigue habiendo exactamente un principal', async () => {
      expect(await principalIds()).toEqual([principal.id]);
    });
  });

  describe('transferencia', () => {
    it('designa al nuevo principal y el anterior pasa a ser un administrador común', async () => {
      await transfer(principalSession, adminA.id).expect(204);

      expect(await principalIds()).toEqual([adminA.id]);
      const detail = await withAccess(
        request(server()).get(`${USERS}/${adminA.id}`),
        adminBSession,
      );
      expect(detail.body).toMatchObject({ esPrincipal: true, modificadoPor: { id: principal.id } });
      // El anterior sigue con su sesión, ahora como administrador común.
      const own = await withAccess(request(server()).get('/api/sesion/usuario'), principalSession);
      expect(own.body).toMatchObject({ rol: 'admin', esPrincipal: false });
    });

    it('las protecciones pasan al nuevo principal y el anterior ya se puede desactivar', async () => {
      await transfer(principalSession, adminA.id).expect(204);

      await post(adminBSession, `/${adminA.id}/desactivar`).expect(409);
      await post(adminBSession, `/${principal.id}/desactivar`).expect(204);
    });

    it('solo el principal puede transferir', async () => {
      const response = await transfer(adminASession, adminB.id);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('No tenés permiso para realizar esta acción');
    });

    it('rechaza transferir a sí mismo, a un abogado o a un administrador desactivado', async () => {
      await post(principalSession, `/${adminB.id}/desactivar`).expect(204);

      for (const id of [principal.id, lawyer.id, adminB.id]) {
        const response = await transfer(principalSession, id);
        expect(response.status).toBe(409);
        expect(response.body.message).toBe(TRANSFER_TARGET_MESSAGE);
      }
      expect(await principalIds()).toEqual([principal.id]);
    });

    it('dos transferencias simultáneas dejan exactamente un principal', async () => {
      const responses = await Promise.all([
        transfer(principalSession, adminA.id),
        transfer(principalSession, adminB.id),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([204, 403]);
      const principals = await principalIds();
      expect(principals).toHaveLength(1);
      expect([adminA.id, adminB.id]).toContain(principals[0]);
    });

    it('responde 404 si la cuenta no existe', async () => {
      await transfer(principalSession, 999999).expect(404);
    });
  });
});
