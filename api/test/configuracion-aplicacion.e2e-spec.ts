import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadTestEnvironment } from './utilidades/base-de-tests.js';
import { createTestApp } from './utilidades/aplicacion-de-tests.js';

const FOREIGN_ORIGIN = 'https://sitio-ajeno.example';

describe('configuración de la aplicación', () => {
  let app: NestExpressApplication;
  const allowedOrigin = loadTestEnvironment().FRONTEND_ORIGINS[0];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde bajo el prefijo /api', async () => {
    await request(app.getHttpServer()).get('/api').expect(200);
    await request(app.getHttpServer()).get('/').expect(404);
  });

  it('habilita CORS con credenciales para un origen de FRONTEND_ORIGINS', async () => {
    const response = await request(app.getHttpServer()).get('/api').set('Origin', allowedOrigin);

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('responde la verificación previa (preflight) de un origen permitido', async () => {
    const response = await request(app.getHttpServer())
      .options('/api')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('no envía ningún encabezado CORS a otro origen', async () => {
    const response = await request(app.getHttpServer()).get('/api').set('Origin', FOREIGN_ORIGIN);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('no autoriza la verificación previa de otro origen', async () => {
    const response = await request(app.getHttpServer())
      .options('/api')
      .set('Origin', FOREIGN_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
