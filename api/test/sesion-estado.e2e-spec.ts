import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Sesion } from '../src/usuarios/sesion.entity.js';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, setCookieHeaders, type TestSession } from './utilidades/sesion-de-prueba.js';

const STATUS = '/api/sesion/estado';
const LOGOUT = '/api/sesion/cerrar';
const FOREIGN_ORIGIN = 'https://sitio-ajeno.example';

const CLIENTE = { tipoPersona: 'fisica' as const, dni: '30111222' };

/**
 * Spec 007, RF-29 a RF-31 y RF-41: el sitio público solo sabe si hay sesión y a qué sección
 * lleva. La consulta es pública, responde siempre 200 y nunca extiende ni renueva la sesión.
 */
describe('GET /api/sesion/estado', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
  });

  const server = () => app.getHttpServer();
  const getStatus = (session?: TestSession) => {
    const call = request(server()).get(STATUS);
    return session ? call.set('Cookie', `access_token=${session.accessToken}`) : call;
  };
  const sessions = () => app.get(DataSource).getRepository(Sesion);

  async function expectSection(session: TestSession | undefined, seccion: string | null) {
    const response = await getStatus(session);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ seccion });
    return response;
  }

  it('responde portal para un cliente', async () => {
    await createTestUser(app, { rol: 'cliente', email: 'ana@mail.com', cliente: CLIENTE });

    await expectSection(await loginAs(app, 'ana@mail.com'), 'portal');
  });

  it('responde portal para un cliente con cambio de contraseña pendiente', async () => {
    await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@mail.com',
      debeCambiarContrasena: true,
      cliente: CLIENTE,
    });

    await expectSection(await loginAs(app, 'ana@mail.com'), 'portal');
  });

  it.each(['abogado', 'admin'] as const)('responde panel para un %s', async (rol) => {
    await createTestUser(app, { rol, email: 'juan@estudio.com' });

    await expectSection(await loginAs(app, 'juan@estudio.com'), 'panel');
  });

  it('responde null sin cookie', async () => {
    await expectSection(undefined, null);
  });

  it('responde null con un token inválido', async () => {
    await expectSection({ accessToken: 'no-es-un-token', refreshToken: '' }, null);
  });

  it('responde null después de cerrar la sesión', async () => {
    await createTestUser(app);
    const session = await loginAs(app, 'juan@estudio.com');
    await request(server())
      .post(LOGOUT)
      .set('Cookie', `refresh_token=${session.refreshToken}`)
      .expect(204);

    await expectSection(session, null);
  });

  it('responde null con la sesión reemplazada por un ingreso desde otro dispositivo', async () => {
    await createTestUser(app);
    const first = await loginAs(app, 'juan@estudio.com');
    await loginAs(app, 'juan@estudio.com');

    await expectSection(first, null);
  });

  it('responde null con la sesión vencida', async () => {
    const usuario = await createTestUser(app);
    const session = await loginAs(app, 'juan@estudio.com');
    await sessions().update({ usuarioId: usuario.id }, { venceEn: new Date(Date.now() - 1000) });

    await expectSection(session, null);
  });

  it('responde null con la cuenta desactivada', async () => {
    const usuario = await createTestUser(app);
    const session = await loginAs(app, 'juan@estudio.com');
    await app.get(DataSource).getRepository(Usuario).update(usuario.id, { activo: false });

    await expectSection(session, null);
  });

  it('no extiende el vencimiento de la sesión ni envía cookies (RF-31)', async () => {
    await createTestUser(app, { rol: 'cliente', email: 'ana@mail.com', cliente: CLIENTE });
    const session = await loginAs(app, 'ana@mail.com');
    const before = (await sessions().findOneByOrFail({})).venceEn.getTime();
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const response = await expectSection(session, 'portal');

    const after = (await sessions().findOneByOrFail({})).venceEn.getTime();
    expect(after).toBe(before);
    expect(setCookieHeaders(response)).toEqual([]);
  });

  it('responde solo la sección, sin ningún dato de la cuenta (RF-41)', async () => {
    await createTestUser(app, { rol: 'cliente', email: 'ana@mail.com', cliente: CLIENTE });

    const response = await expectSection(await loginAs(app, 'ana@mail.com'), 'portal');

    expect(Object.keys(response.body)).toEqual(['seccion']);
  });

  it('no se guarda en el navegador', async () => {
    const response = await getStatus();

    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('habilita CORS con credenciales solo para un origen permitido', async () => {
    const allowedOrigin = loadTestEnvironment().FRONTEND_ORIGINS[0];

    const allowed = await getStatus().set('Origin', allowedOrigin);
    const foreign = await getStatus().set('Origin', FOREIGN_ORIGIN);

    expect(allowed.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
  });
});
