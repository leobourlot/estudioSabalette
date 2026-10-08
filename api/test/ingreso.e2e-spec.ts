import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';

const LOGIN = '/api/sesion/ingresar';
const INVALID_CREDENTIALS = 'Email o contraseña incorrectos';
const TOO_MANY_ATTEMPTS = 'Demasiados intentos. Probá de nuevo en unos minutos';

// El límite de intentos vive en memoria durante todo el archivo: cada test usa su propia IP.
let ipCounter = 0;
const nextIp = () => `203.0.113.${++ipCounter}`;

function cookiesOf(response: request.Response): string[] {
  const header = response.headers['set-cookie'];
  return Array.isArray(header) ? header : header ? [header] : [];
}

function cookieNamed(response: request.Response, name: string): string | undefined {
  return cookiesOf(response).find((cookie) => cookie.startsWith(`${name}=`));
}

describe('POST /api/sesion/ingresar', () => {
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

  function login(body: object, ip = nextIp()) {
    return request(app.getHttpServer()).post(LOGIN).set('X-Forwarded-For', ip).send(body);
  }

  it('con credenciales correctas responde 200 con los datos propios, sin el hash (RF-8)', async () => {
    const usuario = await createTestUser(app);

    const response = await login({ email: 'juan@estudio.com', contrasena: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: usuario.id,
      rol: 'abogado',
      esPrincipal: false,
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Pérez',
      debeCambiarContrasena: false,
      cliente: null,
    });
    expect(JSON.stringify(response.body)).not.toContain('$2b$');
  });

  it('envía las cookies de sesión con sus atributos de seguridad', async () => {
    await createTestUser(app);

    const response = await login({ email: 'juan@estudio.com', contrasena: TEST_PASSWORD });

    const access = cookieNamed(response, 'access_token');
    const refresh = cookieNamed(response, 'refresh_token');
    for (const cookie of [access, refresh]) {
      expect(cookie).toMatch(/; HttpOnly/);
      expect(cookie).toMatch(/; Secure/);
      expect(cookie).toMatch(/; SameSite=Lax/);
    }
    expect(access).toMatch(/; Path=\/api(;|$)/);
    expect(access).toMatch(/Max-Age=900/);
    expect(refresh).toMatch(/; Path=\/api\/sesion(;|$)/);
    expect(refresh).toMatch(/Max-Age=4500;/);
  });

  it('registra la fecha de último ingreso', async () => {
    const usuario = await createTestUser(app);

    await login({ email: 'juan@estudio.com', contrasena: TEST_PASSWORD }).expect(200);

    const stored = await app
      .get(DataSource)
      .getRepository(Usuario)
      .findOneByOrFail({ id: usuario.id });
    expect(stored.ultimoIngreso).toBeInstanceOf(Date);
  });

  it('acepta el email con mayúsculas y espacios (RF-5)', async () => {
    await createTestUser(app);

    await login({ email: '  Juan@Estudio.COM ', contrasena: TEST_PASSWORD }).expect(200);
  });

  it('devuelve los datos de cliente a un cliente', async () => {
    await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456', telefono: '3415551234' },
    });

    const response = await login({ email: 'ana@correo.com', contrasena: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.cliente).toEqual({
      tipoPersona: 'fisica',
      dni: '30123456',
      cuit: null,
      razonSocial: null,
      telefono: '3415551234',
      domicilio: null,
    });
  });

  it.each([
    ['el email no existe', 'nadie@estudio.com', TEST_PASSWORD, true],
    ['la contraseña es incorrecta', 'juan@estudio.com', 'otra clave del estudio', true],
    ['la cuenta está desactivada', 'juan@estudio.com', TEST_PASSWORD, false],
  ])('responde 401 genérico si %s (RF-9)', async (_case, email, contrasena, activo) => {
    await createTestUser(app, { activo });

    const response = await login({ email, contrasena });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(INVALID_CREDENTIALS);
    expect(cookiesOf(response)).toEqual([]);
  });

  it('rechaza con 400 un cuerpo sin contraseña o con campos desconocidos', async () => {
    const missing = await login({ email: 'juan@estudio.com' });
    expect(missing.status).toBe(400);
    expect(missing.body.message).toContain('La contraseña es obligatoria');

    const unknown = await login({ email: 'juan@estudio.com', contrasena: 'x', rol: 'admin' });
    expect(unknown.status).toBe(400);
    expect(unknown.body.message).toContain('El campo rol no está permitido');
  });

  it('bloquea con 429 el sexto intento del mismo email desde la misma IP (RF-10)', async () => {
    await createTestUser(app);
    const ip = nextIp();
    const attempt = () =>
      login({ email: 'juan@estudio.com', contrasena: 'otra clave del estudio' }, ip);

    for (let i = 0; i < 5; i++) expect((await attempt()).status).toBe(401);

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe(TOO_MANY_ATTEMPTS);

    // Ni siquiera la contraseña correcta pasa mientras dure el bloqueo.
    const correct = await login({ email: 'juan@estudio.com', contrasena: TEST_PASSWORD }, ip);
    expect(correct.status).toBe(429);
  });

  it('el bloqueo de un email no afecta a otra IP ni a otro email de la misma IP', async () => {
    await createTestUser(app);
    await createTestUser(app, { email: 'ana@estudio.com' });
    const ip = nextIp();
    for (let i = 0; i < 6; i++) {
      await login({ email: 'juan@estudio.com', contrasena: 'otra clave del estudio' }, ip);
    }

    await login({ email: 'juan@estudio.com', contrasena: TEST_PASSWORD }, nextIp()).expect(200);
    await login({ email: 'ana@estudio.com', contrasena: TEST_PASSWORD }, ip).expect(200);
  });

  it('bloquea con 429 el intento 31 desde una misma IP, aunque cambie el email', async () => {
    const ip = nextIp();
    for (let i = 0; i < 30; i++) {
      const response = await login({ email: `usuario${i}@estudio.com`, contrasena: 'x' }, ip);
      expect(response.status).toBe(401);
    }

    const blocked = await login({ email: 'otro@estudio.com', contrasena: 'x' }, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe(TOO_MANY_ATTEMPTS);
  }, 60_000);
});
