import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';

const LOGIN = '/api/sesion/ingresar';
const INVALID_CREDENTIALS = 'DNI/CUIT o contraseña incorrectos';
const TOO_MANY_ATTEMPTS = 'Demasiados intentos. Probá de nuevo en unos minutos';
const LAWYER_DNI = '20111222';

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

  it('un integrante ingresa con su DNI: 200 con los datos propios, sin el hash (RF-8)', async () => {
    const usuario = await createTestUser(app, { dni: LAWYER_DNI });

    const response = await login({ documento: LAWYER_DNI, contrasena: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: usuario.id,
      rol: 'abogado',
      esPrincipal: false,
      email: 'juan@estudio.com',
      dni: LAWYER_DNI,
      nombre: 'Juan',
      apellido: 'Pérez',
      debeCambiarContrasena: false,
      cliente: null,
    });
    expect(JSON.stringify(response.body)).not.toContain('$2b$');
  });

  it('envía las cookies de sesión con sus atributos de seguridad', async () => {
    await createTestUser(app, { dni: LAWYER_DNI });

    const response = await login({ documento: LAWYER_DNI, contrasena: TEST_PASSWORD });

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
    const usuario = await createTestUser(app, { dni: LAWYER_DNI });

    await login({ documento: LAWYER_DNI, contrasena: TEST_PASSWORD }).expect(200);

    const stored = await app
      .get(DataSource)
      .getRepository(Usuario)
      .findOneByOrFail({ id: usuario.id });
    expect(stored.ultimoIngreso).toBeInstanceOf(Date);
  });

  it('acepta el DNI con puntos, guiones y espacios (RF-5)', async () => {
    await createTestUser(app, { dni: LAWYER_DNI });

    await login({ documento: ' 20.111-222 ', contrasena: TEST_PASSWORD }).expect(200);
  });

  it('un cliente persona física ingresa con su DNI y recibe sus datos de cliente', async () => {
    await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456', telefono: '3415551234' },
    });

    const response = await login({ documento: '30.123.456', contrasena: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.dni).toBeNull();
    expect(response.body.cliente).toEqual({
      tipoPersona: 'fisica',
      dni: '30123456',
      cuit: null,
      razonSocial: null,
      telefono: '3415551234',
      domicilio: null,
    });
  });

  it('un cliente persona jurídica ingresa con su CUIT', async () => {
    const usuario = await createTestUser(app, {
      rol: 'cliente',
      email: 'contacto@empresa.com',
      cliente: { tipoPersona: 'juridica', cuit: '30712345671', razonSocial: 'Empresa S.A.' },
    });

    const response = await login({ documento: '30-71234567-1', contrasena: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(usuario.id);
  });

  it('un cliente sin email ingresa igual con su DNI (RF-3)', async () => {
    const usuario = await createTestUser(app, {
      rol: 'cliente',
      email: null,
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });

    const response = await login({ documento: '30123456', contrasena: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: usuario.id, email: null });
  });

  it.each([
    ['el DNI no existe', '99888777', TEST_PASSWORD, true],
    ['se ingresa el email en lugar del DNI', 'juan@estudio.com', TEST_PASSWORD, true],
    ['el texto no puede ser un DNI ni un CUIT', '123456', TEST_PASSWORD, true],
    ['la contraseña es incorrecta', LAWYER_DNI, 'otra clave del estudio', true],
    ['la cuenta está desactivada', LAWYER_DNI, TEST_PASSWORD, false],
  ])('responde 401 genérico si %s (RF-9)', async (_case, documento, contrasena, activo) => {
    await createTestUser(app, { dni: LAWYER_DNI, activo });

    const response = await login({ documento, contrasena });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(INVALID_CREDENTIALS);
    expect(cookiesOf(response)).toEqual([]);
  });

  it('un integrante sin DNI cargado no puede ingresar, ni siquiera con su email (RF-8)', async () => {
    await createTestUser(app, { dni: null });

    const response = await login({ documento: 'juan@estudio.com', contrasena: TEST_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(INVALID_CREDENTIALS);
  });

  it('rechaza con 400 un cuerpo sin DNI o CUIT, sin contraseña o con campos desconocidos', async () => {
    const withEmail = await login({ email: 'juan@estudio.com', contrasena: 'x' });
    expect(withEmail.status).toBe(400);
    expect(withEmail.body.message).toContain('El DNI o CUIT es obligatorio');
    expect(withEmail.body.message).toContain('El campo email no está permitido');

    const missing = await login({ documento: LAWYER_DNI });
    expect(missing.status).toBe(400);
    expect(missing.body.message).toContain('La contraseña es obligatoria');

    const unknown = await login({ documento: LAWYER_DNI, contrasena: 'x', rol: 'admin' });
    expect(unknown.status).toBe(400);
    expect(unknown.body.message).toContain('El campo rol no está permitido');
  });

  it('bloquea con 429 el sexto intento del mismo DNI desde la misma IP (RF-10)', async () => {
    await createTestUser(app, { dni: LAWYER_DNI });
    const ip = nextIp();
    const attempt = () =>
      login({ documento: LAWYER_DNI, contrasena: 'otra clave del estudio' }, ip);

    for (let i = 0; i < 5; i++) expect((await attempt()).status).toBe(401);

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe(TOO_MANY_ATTEMPTS);

    // Ni la contraseña correcta pasa mientras dure el bloqueo, aunque el DNI se escriba distinto.
    const correct = await login({ documento: '20.111.222', contrasena: TEST_PASSWORD }, ip);
    expect(correct.status).toBe(429);
  });

  it('el bloqueo de un DNI no afecta a otra IP ni a otro DNI de la misma IP', async () => {
    await createTestUser(app, { dni: LAWYER_DNI });
    await createTestUser(app, { email: 'ana@estudio.com', dni: '27333444' });
    const ip = nextIp();
    for (let i = 0; i < 6; i++) {
      await login({ documento: LAWYER_DNI, contrasena: 'otra clave del estudio' }, ip);
    }

    await login({ documento: LAWYER_DNI, contrasena: TEST_PASSWORD }, nextIp()).expect(200);
    await login({ documento: '27333444', contrasena: TEST_PASSWORD }, ip).expect(200);
  });

  it('bloquea con 429 el intento 31 desde una misma IP, aunque cambie el DNI', async () => {
    const ip = nextIp();
    for (let i = 0; i < 30; i++) {
      const response = await login({ documento: String(30000000 + i), contrasena: 'x' }, ip);
      expect(response.status).toBe(401);
    }

    const blocked = await login({ documento: '30999999', contrasena: 'x' }, ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe(TOO_MANY_ATTEMPTS);
  }, 60_000);
});
