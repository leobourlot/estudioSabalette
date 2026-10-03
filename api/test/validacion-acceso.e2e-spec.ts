import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const FORBIDDEN = 'No tenés permiso para realizar esta acción';
const TEMPORARY = { contrasenaTemporal: 'clave temporal 2026' };

/**
 * Validación de la spec 001 (T44): ningún endpoint del panel responde a un cliente ni sin
 * sesión, y ninguna respuesta de la sesión incluye datos de otro usuario.
 */
describe('validación de acceso (RF-18, RF-19, RF-35)', () => {
  let app: NestExpressApplication;
  let otherClient: Usuario;
  let clientA: TestSession;
  let clientB: TestSession;
  let usuarioA: Usuario;
  let usuarioB: Usuario;

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await createTestUser(app, { rol: 'admin', esPrincipal: true, email: 'principal@estudio.com' });
    usuarioA = await createTestUser(app, {
      rol: 'cliente',
      email: 'a@correo.com',
      nombre: 'Ana',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    usuarioB = await createTestUser(app, {
      rol: 'cliente',
      email: 'b@correo.com',
      nombre: 'Bruno',
      cliente: { tipoPersona: 'fisica', dni: '28999888' },
    });
    otherClient = usuarioB;
    clientA = await loginAs(app, 'a@correo.com');
    clientB = await loginAs(app, 'b@correo.com');
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  const PANEL_ENDPOINTS: [string, string, object?][] = [
    ['get', '/api/panel/usuarios'],
    ['get', '/api/panel/usuarios/:id'],
    ['post', '/api/panel/usuarios', { rol: 'cliente' }],
    ['patch', '/api/panel/usuarios/:id', { nombre: 'X' }],
    ['post', '/api/panel/usuarios/:id/desactivar'],
    ['post', '/api/panel/usuarios/:id/reactivar', TEMPORARY],
    ['post', '/api/panel/usuarios/:id/restablecer-contrasena', TEMPORARY],
    ['post', '/api/panel/usuarios/:id/liberar-email'],
    ['post', '/api/panel/usuarios/:id/transferir-principal'],
  ];

  function call(method: string, path: string, body: object | undefined, session?: TestSession) {
    const url = path.replace(':id', String(otherClient.id));
    const agent = request(app.getHttpServer()) as unknown as Record<
      string,
      (url: string) => request.Test
    >;
    const test = agent[method](url);
    if (session) test.set('Cookie', `access_token=${session.accessToken}`);
    return body ? test.send(body) : test;
  }

  it.each(PANEL_ENDPOINTS)('un cliente recibe 403 en %s %s', async (method, path, body) => {
    const response = await call(method, path, body, clientA);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(FORBIDDEN);
  });

  it.each(PANEL_ENDPOINTS)('sin sesión, %s %s responde 401', async (method, path, body) => {
    await call(method, path, body).expect(401);
  });

  it('cada cliente ve solo sus propios datos', async () => {
    const own = (session: TestSession) =>
      request(app.getHttpServer())
        .get('/api/sesion/usuario')
        .set('Cookie', `access_token=${session.accessToken}`)
        .expect(200);

    const a = (await own(clientA)).body;
    const b = (await own(clientB)).body;

    expect(a).toMatchObject({ id: usuarioA.id, nombre: 'Ana', cliente: { dni: '30123456' } });
    expect(b).toMatchObject({ id: usuarioB.id, nombre: 'Bruno', cliente: { dni: '28999888' } });
    expect(JSON.stringify(a)).not.toContain('Bruno');
    expect(JSON.stringify(a)).not.toContain('28999888');
  });

  it('el estado de las cuentas no cambió después de los intentos rechazados', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/sesion/usuario')
      .set('Cookie', `access_token=${clientB.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ nombre: 'Bruno', debeCambiarContrasena: false });
  });
});
