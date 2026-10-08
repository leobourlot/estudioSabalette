import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

/**
 * Ninguna respuesta de la API queda guardada en el navegador (spec 004, RF-6): todas llevan
 * Cache-Control: no-store, salgan bien o mal.
 */
describe('respuestas sin caché', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await createTestUser(app);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('una respuesta 200 del panel lleva Cache-Control: no-store', async () => {
    const { accessToken } = await loginAs(app, 'juan@estudio.com');

    const response = await request(app.getHttpServer())
      .get('/api/panel/causas')
      .set('Cookie', `access_token=${accessToken}`)
      .expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('una respuesta 401 lleva Cache-Control: no-store', async () => {
    const response = await request(app.getHttpServer()).get('/api/panel/causas').expect(401);

    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('una respuesta 404 lleva Cache-Control: no-store', async () => {
    const response = await request(app.getHttpServer()).get('/api/no-existe').expect(404);

    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('el ingreso, que lleva las cookies de sesión, lleva Cache-Control: no-store', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/sesion/ingresar')
      .set('X-Forwarded-For', '198.51.100.252')
      .send({ email: 'juan@estudio.com', contrasena: TEST_PASSWORD })
      .expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
  });
});
