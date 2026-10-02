import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';

const FOREIGN_ORIGIN = 'https://sitio-ajeno.example';
// CORS se aplica antes del ruteo, así que cualquier ruta sirve para verificar los encabezados.
const ROUTE = '/api/sesion/usuario';

describe('configuración de la aplicación', () => {
  let app: NestExpressApplication;
  const allowedOrigin = loadTestEnvironment().FRONTEND_ORIGINS[0];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('habilita CORS con credenciales para un origen de FRONTEND_ORIGINS', async () => {
    const response = await request(app.getHttpServer()).get(ROUTE).set('Origin', allowedOrigin);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('responde la verificación previa (preflight) de un origen permitido', async () => {
    const response = await request(app.getHttpServer())
      .options(ROUTE)
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('no envía ningún encabezado CORS a otro origen', async () => {
    const response = await request(app.getHttpServer()).get(ROUTE).set('Origin', FOREIGN_ORIGIN);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('no autoriza la verificación previa de otro origen', async () => {
    const response = await request(app.getHttpServer())
      .options(ROUTE)
      .set('Origin', FOREIGN_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
