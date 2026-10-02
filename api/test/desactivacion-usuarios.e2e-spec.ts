import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';
import { loginAs, nextTestIp, type TestSession } from './utilidades/sesion-de-prueba.js';

const USERS = '/api/panel/usuarios';
const TEMPORARY_PASSWORD = 'clave temporal 2026';

describe('desactivación y reactivación de cuentas', () => {
  let app: NestExpressApplication;
  let principal: Usuario;
  let admin: Usuario;
  let lawyer: Usuario;
  let client: Usuario;
  let adminSession: TestSession;
  let lawyerSession: TestSession;

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
    });
    admin = await createTestUser(app, {
      rol: 'admin',
      email: 'admin@estudio.com',
      nombre: 'Mario',
      apellido: 'Rossi',
    });
    lawyer = await createTestUser(app, { email: 'juan@estudio.com' });
    client = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    adminSession = await loginAs(app, 'admin@estudio.com');
    lawyerSession = await loginAs(app, 'juan@estudio.com');
  }, 60_000);

  const server = () => app.getHttpServer();
  const withAccess = (call: request.Test, session: TestSession) =>
    call.set('Cookie', `access_token=${session.accessToken}`);
  const deactivate = (session: TestSession, id: number) =>
    withAccess(request(server()).post(`${USERS}/${id}/desactivar`), session);
  const reactivate = (session: TestSession, id: number, body: object = {}) =>
    withAccess(request(server()).post(`${USERS}/${id}/reactivar`), session).send(body);
  const detail = (id: number) => withAccess(request(server()).get(`${USERS}/${id}`), adminSession);
  const login = (email: string, contrasena: string) =>
    request(server())
      .post('/api/sesion/ingresar')
      .set('X-Forwarded-For', nextTestIp())
      .send({ email, contrasena });

  describe('desactivar (RF-29)', () => {
    it('cierra la sesión abierta y bloquea el ingreso, sin borrar la cuenta', async () => {
      await deactivate(adminSession, lawyer.id).expect(204);

      await withAccess(request(server()).get('/api/sesion/usuario'), lawyerSession).expect(401);
      await request(server())
        .post('/api/sesion/renovar')
        .set('Cookie', `refresh_token=${lawyerSession.refreshToken}`)
        .expect(401);
      const relogin = await login('juan@estudio.com', TEST_PASSWORD);
      expect(relogin.status).toBe(401);
      expect(relogin.body.message).toBe('Email o contraseña incorrectos');

      const response = await detail(lawyer.id).expect(200);
      expect(response.body).toMatchObject({
        activo: false,
        modificadoPor: { id: admin.id, nombre: 'Mario', apellido: 'Rossi' },
      });
    });

    it('desactivar dos veces no es un error', async () => {
      await deactivate(adminSession, client.id).expect(204);
      await deactivate(adminSession, client.id).expect(204);
    });

    it('un abogado desactiva clientes, pero no integrantes (RF-21)', async () => {
      await deactivate(lawyerSession, client.id).expect(204);
      await deactivate(lawyerSession, admin.id).expect(403);
    });

    it('nadie desactiva al administrador principal (RF-31)', async () => {
      const response = await deactivate(adminSession, principal.id);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('No se puede modificar al administrador principal');
    });
  });

  describe('reactivar (RF-30)', () => {
    beforeEach(async () => {
      await deactivate(adminSession, lawyer.id).expect(204);
    });

    it('exige una contraseña temporal nueva y deja pendiente el cambio', async () => {
      await reactivate(adminSession, lawyer.id, { contrasenaTemporal: TEMPORARY_PASSWORD }).expect(
        204,
      );

      await login('juan@estudio.com', TEST_PASSWORD).expect(401);
      const response = await login('juan@estudio.com', TEMPORARY_PASSWORD);
      expect(response.status).toBe(200);
      expect(response.body.debeCambiarContrasena).toBe(true);
      expect((await detail(lawyer.id)).body.activo).toBe(true);
    });

    it('rechaza la reactivación sin contraseña temporal o con una que no cumple las reglas', async () => {
      const missing = await reactivate(adminSession, lawyer.id);
      expect(missing.status).toBe(400);
      expect(missing.body.message).toContain('La contraseña temporal es obligatoria');

      const short = await reactivate(adminSession, lawyer.id, { contrasenaTemporal: 'corta' });
      expect(short.status).toBe(400);
      expect(short.body.message).toBe('La contraseña debe tener al menos 10 caracteres');
    });

    it('responde 409 si la cuenta ya está activa', async () => {
      const response = await reactivate(adminSession, client.id, {
        contrasenaTemporal: TEMPORARY_PASSWORD,
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('La cuenta ya está activa');
    });

    it('responde 409 si la cuenta no tiene email (RF-24)', async () => {
      const withoutEmail = await createTestUser(app, { email: null, activo: false });

      const response = await reactivate(adminSession, withoutEmail.id, {
        contrasenaTemporal: TEMPORARY_PASSWORD,
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        'La cuenta no tiene email. Asignale uno antes de reactivarla',
      );
    });

    it('un abogado reactiva clientes, pero no integrantes (RF-21)', async () => {
      // El abogado de siempre quedó desactivado en el beforeEach: actúa otro.
      await createTestUser(app, { email: 'pedro@estudio.com', nombre: 'Pedro' });
      const otherLawyerSession = await loginAs(app, 'pedro@estudio.com');
      await deactivate(adminSession, client.id).expect(204);

      const body = { contrasenaTemporal: TEMPORARY_PASSWORD };
      await reactivate(otherLawyerSession, client.id, body).expect(204);
      await reactivate(otherLawyerSession, lawyer.id, body).expect(403);
    });
  });

  it('responde 404 si la cuenta no existe', async () => {
    await deactivate(adminSession, 999999).expect(404);
    await reactivate(adminSession, 999999, { contrasenaTemporal: TEMPORARY_PASSWORD }).expect(404);
  });
});
