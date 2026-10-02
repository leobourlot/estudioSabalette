import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Sesion } from '../src/usuarios/sesion.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { TestOnlyController } from './utilidades/controlador-de-prueba.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';
import {
  cookieWasCleared,
  loginAs,
  nextTestIp,
  type TestSession,
} from './utilidades/sesion-de-prueba.js';

const CHANGE_PASSWORD = '/api/sesion/contrasena';
const NEW_PASSWORD = 'otra clave segura 2026';
const WRONG_CURRENT = 'La contraseña actual no es correcta';
const SESSION_CLOSED = 'Por seguridad, cerramos tu sesión. Volvé a ingresar';
const PENDING_CHANGE = 'Tenés que cambiar tu contraseña antes de continuar';

describe('PUT /api/sesion/contrasena', () => {
  let app: NestExpressApplication;
  let session: TestSession;

  beforeAll(async () => {
    app = await createTestApp({ extraControllers: [TestOnlyController] });
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  async function startWith(data: { debeCambiarContrasena?: boolean } = {}) {
    await clearTables(app);
    await createTestUser(app, data);
    session = await loginAs(app, 'juan@estudio.com');
  }

  beforeEach(async () => {
    await startWith();
  });

  const withAccess = (call: request.Test) =>
    call.set('Cookie', `access_token=${session.accessToken}`);
  const changePassword = (body: object) =>
    withAccess(request(app.getHttpServer()).put(CHANGE_PASSWORD)).send(body);
  const getOwnUser = () => withAccess(request(app.getHttpServer()).get('/api/sesion/usuario'));
  const protectedRoute = () =>
    withAccess(request(app.getHttpServer()).get('/api/prueba/protegida'));
  const loginWith = (contrasena: string) =>
    request(app.getHttpServer())
      .post('/api/sesion/ingresar')
      .set('X-Forwarded-For', nextTestIp())
      .send({ email: 'juan@estudio.com', contrasena });

  it('cambia la contraseña y mantiene la sesión actual (RF-36)', async () => {
    await changePassword({ contrasenaActual: TEST_PASSWORD, contrasenaNueva: NEW_PASSWORD }).expect(
      204,
    );

    await getOwnUser().expect(200);
    await loginWith(TEST_PASSWORD).expect(401);
    await loginWith(NEW_PASSWORD).expect(200);
  });

  it('con el cambio pendiente: bloquea las demás rutas y, al cambiar, las habilita (RF-11, RF-36)', async () => {
    await startWith({ debeCambiarContrasena: true });

    const blocked = await protectedRoute();
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toBe(PENDING_CHANGE);

    await changePassword({ contrasenaActual: TEST_PASSWORD, contrasenaNueva: NEW_PASSWORD }).expect(
      204,
    );

    expect((await getOwnUser().expect(200)).body.debeCambiarContrasena).toBe(false);
    await protectedRoute().expect(200);
  });

  it('rechaza con 400 una contraseña actual incorrecta (RF-37)', async () => {
    const response = await changePassword({
      contrasenaActual: 'no es la clave',
      contrasenaNueva: NEW_PASSWORD,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(WRONG_CURRENT);
  });

  it.each([
    ['tiene tildes', 'contraseña nueva 2026', 'La contraseña no puede tener tildes, ñ ni emojis'],
    ['es corta', 'corta', 'La contraseña debe tener al menos 10 caracteres'],
    ['es larga', 'a'.repeat(65), 'La contraseña no puede tener más de 64 caracteres'],
    ['es igual a la actual', TEST_PASSWORD, 'La contraseña nueva debe ser distinta de la actual'],
  ])(
    'rechaza con 400 una contraseña nueva que %s (RF-39)',
    async (_case, contrasenaNueva, message) => {
      const response = await changePassword({ contrasenaActual: TEST_PASSWORD, contrasenaNueva });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(message);
      await loginWith(TEST_PASSWORD).expect(200);
    },
  );

  it('rechaza con 400 un cuerpo incompleto o con campos desconocidos', async () => {
    await changePassword({ contrasenaActual: TEST_PASSWORD }).expect(400);
    await changePassword({
      contrasenaActual: TEST_PASSWORD,
      contrasenaNueva: NEW_PASSWORD,
      debeCambiarContrasena: false,
    }).expect(400);
  });

  it('al quinto error de la contraseña actual cierra la sesión (RF-38)', async () => {
    const wrong = { contrasenaActual: 'no es la clave', contrasenaNueva: NEW_PASSWORD };
    for (let i = 0; i < 4; i++) {
      expect((await changePassword(wrong)).status).toBe(400);
    }

    const fifth = await changePassword(wrong);

    expect(fifth.status).toBe(401);
    expect(fifth.body.message).toBe(SESSION_CLOSED);
    expect(cookieWasCleared(fifth, 'access_token')).toBe(true);
    expect(cookieWasCleared(fifth, 'refresh_token')).toBe(true);
    await getOwnUser().expect(401);
  });

  it('los errores de hace más de 15 minutos no cuentan para el cierre', async () => {
    const sessions = app.get(DataSource).getRepository(Sesion);
    const [stored] = await sessions.find();
    await sessions.update(stored.id, {
      intentosContrasenaFallidos: 4,
      primerIntentoFallidoEn: new Date(Date.now() - 16 * 60_000),
    });

    const response = await changePassword({
      contrasenaActual: 'no es la clave',
      contrasenaNueva: NEW_PASSWORD,
    });

    expect(response.status).toBe(400);
    expect((await sessions.findOneByOrFail({ id: stored.id })).intentosContrasenaFallidos).toBe(1);
  });

  it('responde 401 sin sesión', async () => {
    await request(app.getHttpServer())
      .put(CHANGE_PASSWORD)
      .send({ contrasenaActual: TEST_PASSWORD, contrasenaNueva: NEW_PASSWORD })
      .expect(401);
  });
});
