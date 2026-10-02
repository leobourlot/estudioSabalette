import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordsService } from '../src/autenticacion/contrasenas.service.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';
import { loginAs, nextTestIp, type TestSession } from './utilidades/sesion-de-prueba.js';

const USERS = '/api/panel/usuarios';
const TEMPORARY_PASSWORD = 'clave temporal 2026';

describe('restablecimiento de contraseña y liberación de email', () => {
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

  afterEach(() => {
    vi.restoreAllMocks();
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
  const resetPassword = (session: TestSession, id: number, body: object = {}) =>
    withAccess(request(server()).post(`${USERS}/${id}/restablecer-contrasena`), session).send(body);
  const releaseEmail = (session: TestSession, id: number) =>
    withAccess(request(server()).post(`${USERS}/${id}/liberar-email`), session);
  const deactivate = (id: number) =>
    withAccess(request(server()).post(`${USERS}/${id}/desactivar`), adminSession).expect(204);
  const detail = (id: number) => withAccess(request(server()).get(`${USERS}/${id}`), adminSession);
  const login = (email: string, contrasena: string) =>
    request(server())
      .post('/api/sesion/ingresar')
      .set('X-Forwarded-For', nextTestIp())
      .send({ email, contrasena });

  describe('restablecer la contraseña (RF-33)', () => {
    it('guarda la temporal, deja el cambio pendiente y cierra la sesión', async () => {
      await resetPassword(adminSession, lawyer.id, {
        contrasenaTemporal: TEMPORARY_PASSWORD,
      }).expect(204);

      await withAccess(request(server()).get('/api/sesion/usuario'), lawyerSession).expect(401);
      await login('juan@estudio.com', TEST_PASSWORD).expect(401);
      const response = await login('juan@estudio.com', TEMPORARY_PASSWORD);
      expect(response.status).toBe(200);
      expect(response.body.debeCambiarContrasena).toBe(true);
      expect((await detail(lawyer.id)).body.modificadoPor).toMatchObject({ id: admin.id });
    });

    it('prevalece sobre un cambio de contraseña simultáneo del propio usuario', async () => {
      const passwords = app.get(PasswordsService);
      const originalHash = passwords.hash.bind(passwords);
      let interleaved = false;
      // El cambio del usuario ya verificó su contraseña actual y está por guardar la nueva:
      // justo ahí, un administrador restablece la contraseña.
      vi.spyOn(passwords, 'hash').mockImplementation(async (password: string) => {
        if (!interleaved && password === 'mi clave nueva 2026') {
          interleaved = true;
          await resetPassword(adminSession, lawyer.id, {
            contrasenaTemporal: TEMPORARY_PASSWORD,
          }).expect(204);
        }
        return originalHash(password);
      });

      const change = await withAccess(
        request(server()).put('/api/sesion/contrasena'),
        lawyerSession,
      ).send({
        contrasenaActual: TEST_PASSWORD,
        contrasenaNueva: 'mi clave nueva 2026',
      });

      expect(interleaved).toBe(true);
      expect(change.status).toBe(401);
      await login('juan@estudio.com', 'mi clave nueva 2026').expect(401);
      await login('juan@estudio.com', TEMPORARY_PASSWORD).expect(200);
    });

    it('aplica las reglas de RF-39 a la temporal', async () => {
      const short = await resetPassword(adminSession, lawyer.id, { contrasenaTemporal: 'corta' });
      expect(short.status).toBe(400);
      expect(short.body.message).toBe('La contraseña debe tener al menos 10 caracteres');

      await resetPassword(adminSession, lawyer.id).expect(400);
    });

    it('un abogado restablece la de un cliente, pero no la de un integrante (RF-21)', async () => {
      const body = { contrasenaTemporal: TEMPORARY_PASSWORD };
      await resetPassword(lawyerSession, client.id, body).expect(204);
      await resetPassword(lawyerSession, admin.id, body).expect(403);
    });

    it('otro administrador no puede restablecer la del principal (RF-31)', async () => {
      const response = await resetPassword(adminSession, principal.id, {
        contrasenaTemporal: TEMPORARY_PASSWORD,
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('No se puede modificar al administrador principal');
    });
  });

  describe('liberar el email (RF-24)', () => {
    it('deja la cuenta desactivada sin email y permite usarlo en otra cuenta', async () => {
      await deactivate(client.id);

      await releaseEmail(adminSession, client.id).expect(204);

      expect((await detail(client.id)).body).toMatchObject({ email: null, activo: false });
      await withAccess(request(server()).post(USERS), adminSession)
        .send({
          rol: 'abogado',
          email: 'ana@correo.com',
          nombre: 'Ana',
          apellido: 'Gómez',
          contrasenaTemporal: TEMPORARY_PASSWORD,
        })
        .expect(201);
    });

    it('para reactivar la cuenta, primero hay que asignarle un email nuevo', async () => {
      await deactivate(client.id);
      await releaseEmail(adminSession, client.id).expect(204);
      const body = { contrasenaTemporal: TEMPORARY_PASSWORD };

      await withAccess(request(server()).post(`${USERS}/${client.id}/reactivar`), adminSession)
        .send(body)
        .expect(409);
      await withAccess(request(server()).patch(`${USERS}/${client.id}`), adminSession)
        .send({ email: 'ana.nueva@correo.com' })
        .expect(200);
      await withAccess(request(server()).post(`${USERS}/${client.id}/reactivar`), adminSession)
        .send(body)
        .expect(204);
    });

    it('responde 409 si la cuenta está activa', async () => {
      const response = await releaseEmail(adminSession, client.id);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        'Solo se puede liberar el email de una cuenta desactivada',
      );
    });

    it('un abogado no puede liberar emails', async () => {
      await deactivate(client.id);

      await releaseEmail(lawyerSession, client.id).expect(403);
    });
  });

  it('responde 404 si la cuenta no existe', async () => {
    await resetPassword(adminSession, 999999, { contrasenaTemporal: TEMPORARY_PASSWORD }).expect(
      404,
    );
    await releaseEmail(adminSession, 999999).expect(404);
  });
});
