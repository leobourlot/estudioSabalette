import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Sesion } from '../src/usuarios/sesion.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';
import { cookieValue, loginAs, setCookieHeaders } from './utilidades/sesion-de-prueba.js';

const MINUTE = 60_000;
const CLIENT_EMAIL = 'cliente@correo.com';
const LAWYER_EMAIL = 'abogada@estudio.com';

/**
 * Duración de la sesión por rol (spec 001, RF-12; spec 004, RF-4): 20 minutos sin uso para los
 * clientes y 1 hora para los integrantes. Cada consulta al servidor y cada renovación corren el
 * vencimiento.
 */
describe('Sesión por rol', () => {
  let app: NestExpressApplication;
  let sessions: Repository<Sesion>;
  let client: Usuario;
  let lawyer: Usuario;

  beforeAll(async () => {
    app = await createTestApp();
    sessions = app.get(DataSource).getRepository(Sesion);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
    client = await createTestUser(app, {
      rol: 'cliente',
      email: CLIENT_EMAIL,
      cliente: { tipoPersona: 'fisica', dni: '30111222' },
    });
    lawyer = await createTestUser(app, { rol: 'abogado', email: LAWYER_EMAIL });
  });

  async function sessionOf(usuario: Usuario): Promise<Sesion> {
    return sessions.findOneByOrFail({ usuarioId: usuario.id });
  }

  /** Verifica que la sesión vence a ahora + minutos, con un minuto de margen. */
  async function expectExpiresIn(usuario: Usuario, minutes: number): Promise<void> {
    const { venceEn } = await sessionOf(usuario);
    expect(Math.abs(venceEn.getTime() - (Date.now() + minutes * MINUTE))).toBeLessThan(MINUTE);
  }

  /** Deja la sesión a punto de vencer, para ver si una acción la extiende. */
  async function almostExpire(usuario: Usuario): Promise<Date> {
    const venceEn = new Date(Date.now() + 2 * MINUTE);
    await sessions.update((await sessionOf(usuario)).id, { venceEn });
    return (await sessionOf(usuario)).venceEn;
  }

  const ownUser = (accessToken: string) =>
    request(app.getHttpServer())
      .get('/api/sesion/usuario')
      .set('Cookie', `access_token=${accessToken}`);

  const refresh = (refreshToken: string) =>
    request(app.getHttpServer())
      .post('/api/sesion/renovar')
      .set('Cookie', `refresh_token=${refreshToken}`);

  it('el ingreso de un cliente deja la sesión con 20 minutos sin uso', async () => {
    await loginAs(app, CLIENT_EMAIL);

    await expectExpiresIn(client, 20);
  });

  it('el ingreso de un abogado deja la sesión con 1 hora sin uso', async () => {
    await loginAs(app, LAWYER_EMAIL);

    await expectExpiresIn(lawyer, 60);
  });

  it.each([
    ['un cliente', CLIENT_EMAIL, 20],
    ['un abogado', LAWYER_EMAIL, 60],
  ])('cada consulta de %s corre el vencimiento de nuevo', async (_case, email, minutes) => {
    const { accessToken } = await loginAs(app, email);
    const usuario = email === CLIENT_EMAIL ? client : lawyer;
    await almostExpire(usuario);

    await ownUser(accessToken).expect(200);

    await expectExpiresIn(usuario, minutes);
  });

  it('cerrar sesión no extiende el vencimiento', async () => {
    const { accessToken } = await loginAs(app, CLIENT_EMAIL);
    const before = await almostExpire(client);

    // Sin cookie de renovación, el cierre no identifica ninguna sesión: no cambia nada.
    await request(app.getHttpServer())
      .post('/api/sesion/cerrar')
      .set('Cookie', `access_token=${accessToken}`)
      .expect(204);

    expect((await sessionOf(client)).venceEn).toEqual(before);
  });

  it('con la sesión vencida, la consulta y la renovación responden 401', async () => {
    const { accessToken, refreshToken } = await loginAs(app, CLIENT_EMAIL);
    await sessions.update((await sessionOf(client)).id, {
      venceEn: new Date(Date.now() - 1000),
    });

    await ownUser(accessToken).expect(401);
    await refresh(refreshToken).expect(401);
  });

  it.each([
    ['un cliente', CLIENT_EMAIL, 20],
    ['un abogado', LAWYER_EMAIL, 60],
  ])('la renovación de %s corre el vencimiento según su rol', async (_case, email, minutes) => {
    const { refreshToken } = await loginAs(app, email);
    const usuario = email === CLIENT_EMAIL ? client : lawyer;
    await almostExpire(usuario);

    await refresh(refreshToken).expect(204);

    await expectExpiresIn(usuario, minutes);
  });

  it('la cookie de renovación dura 75 minutos, al ingresar y al renovar', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/sesion/ingresar')
      .set('X-Forwarded-For', '198.51.100.251')
      .send({ email: CLIENT_EMAIL, contrasena: TEST_PASSWORD })
      .expect(200);
    const refreshCookie = (response: request.Response) =>
      setCookieHeaders(response).find((cookie) => cookie.startsWith('refresh_token='));

    expect(refreshCookie(login)).toMatch(/Max-Age=4500;/);

    const renewed = await refresh(cookieValue(login, 'refresh_token')!).expect(204);
    expect(refreshCookie(renewed)).toMatch(/Max-Age=4500;/);
  });
});
