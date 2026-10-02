import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, nextTestIp, type TestSession } from './utilidades/sesion-de-prueba.js';

const USERS = '/api/panel/usuarios';
const TEMPORARY_PASSWORD = 'clave temporal 2026';

const newLawyer = {
  rol: 'abogado',
  email: 'nuevo@estudio.com',
  nombre: 'Marcos',
  apellido: 'Díaz',
  contrasenaTemporal: TEMPORARY_PASSWORD,
};

const naturalPerson = {
  rol: 'cliente',
  email: 'ana@correo.com',
  nombre: 'Ana',
  apellido: 'Gómez',
  contrasenaTemporal: TEMPORARY_PASSWORD,
  cliente: { tipoPersona: 'fisica', dni: '30.123.456', telefono: '3415551234' },
};

const legalPerson = {
  rol: 'cliente',
  email: 'contacto@empresa.com',
  nombre: 'Laura',
  apellido: 'Sosa',
  contrasenaTemporal: TEMPORARY_PASSWORD,
  cliente: {
    tipoPersona: 'juridica',
    cuit: '30-71234567-1',
    razonSocial: 'Empresa S.A.',
    domicilio: 'San Martín 123',
  },
};

describe('POST /api/panel/usuarios (alta de cuentas)', () => {
  let app: NestExpressApplication;
  let principal: Usuario;
  let lawyer: Usuario;
  let adminSession: TestSession;
  let lawyerSession: TestSession;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
    principal = await createTestUser(app, {
      rol: 'admin',
      esPrincipal: true,
      email: 'principal@estudio.com',
      nombre: 'Carla',
      apellido: 'Sabalette',
    });
    lawyer = await createTestUser(app, { email: 'juan@estudio.com' });
    adminSession = await loginAs(app, 'principal@estudio.com');
    lawyerSession = await loginAs(app, 'juan@estudio.com');
  });

  const create = (session: TestSession | null, body: object) => {
    const call = request(app.getHttpServer()).post(USERS);
    return (session ? call.set('Cookie', `access_token=${session.accessToken}`) : call).send(body);
  };

  it('un administrador crea un abogado con contraseña temporal y cambio pendiente (RF-22)', async () => {
    const response = await create(adminSession, newLawyer);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      rol: 'abogado',
      esPrincipal: false,
      email: 'nuevo@estudio.com',
      nombre: 'Marcos',
      apellido: 'Díaz',
      debeCambiarContrasena: true,
      activo: true,
      ultimoIngreso: null,
      cliente: null,
      creadoPor: { id: principal.id, nombre: 'Carla', apellido: 'Sabalette' },
      modificadoPor: null,
      modificadoEn: null,
    });
    expect(typeof response.body.creadoEn).toBe('string');
    expect(JSON.stringify(response.body)).not.toContain('$2b$');

    // La cuenta nueva ingresa con la contraseña temporal y tiene el cambio pendiente.
    const login = await request(app.getHttpServer())
      .post('/api/sesion/ingresar')
      .set('X-Forwarded-For', nextTestIp())
      .send({ email: 'nuevo@estudio.com', contrasena: TEMPORARY_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.debeCambiarContrasena).toBe(true);
  });

  it('un abogado crea un cliente persona física, con el DNI normalizado (RF-3, RF-4)', async () => {
    const response = await create(lawyerSession, naturalPerson);

    expect(response.status).toBe(201);
    expect(response.body.cliente).toEqual({
      tipoPersona: 'fisica',
      dni: '30123456',
      cuit: null,
      razonSocial: null,
      telefono: '3415551234',
      domicilio: null,
    });
    expect(response.body.creadoPor).toEqual({ id: lawyer.id, nombre: 'Juan', apellido: 'Pérez' });
  });

  it('un abogado crea un cliente persona jurídica, con su persona de contacto', async () => {
    const response = await create(lawyerSession, legalPerson);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ nombre: 'Laura', apellido: 'Sosa' });
    expect(response.body.cliente).toEqual({
      tipoPersona: 'juridica',
      dni: null,
      cuit: '30712345671',
      razonSocial: 'Empresa S.A.',
      telefono: null,
      domicilio: 'San Martín 123',
    });
  });

  it.each(['abogado', 'admin'])(
    'un abogado no puede crear una cuenta de %s (RF-21)',
    async (rol) => {
      const response = await create(lawyerSession, { ...newLawyer, rol });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('No tenés permiso para realizar esta acción');
    },
  );

  it('responde 409 si ya existe una cuenta activa con ese email (RF-23)', async () => {
    const response = await create(adminSession, { ...newLawyer, email: ' Juan@Estudio.com ' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Ya existe una cuenta con ese email');
  });

  it('responde 409 si el email pertenece a una cuenta desactivada (RF-24)', async () => {
    await createTestUser(app, { email: 'ex@estudio.com', activo: false });

    const response = await create(adminSession, { ...newLawyer, email: 'ex@estudio.com' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Ese email pertenece a una cuenta desactivada');
  });

  it('responde 409 si ya existe un cliente con ese DNI (RF-25)', async () => {
    await create(lawyerSession, naturalPerson).expect(201);

    const response = await create(lawyerSession, {
      ...naturalPerson,
      email: 'otra@correo.com',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Ya existe un cliente con ese DNI o CUIT');
  });

  it('si el cliente con ese CUIT está desactivado, sugiere reactivarlo (RF-25)', async () => {
    await createTestUser(app, {
      rol: 'cliente',
      email: 'vieja@empresa.com',
      activo: false,
      cliente: { tipoPersona: 'juridica', cuit: '30712345671', razonSocial: 'Empresa S.A.' },
    });

    const response = await create(lawyerSession, legalPerson);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      'Ya existe un cliente con ese DNI o CUIT. Está desactivado: reactivalo en lugar de crear uno nuevo',
    );
  });

  it('aplica las reglas de RF-39 a la contraseña temporal', async () => {
    const response = await create(adminSession, { ...newLawyer, contrasenaTemporal: 'corta' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('La contraseña debe tener al menos 10 caracteres');
  });

  it('responde 400 con el mensaje del campo inválido', async () => {
    const response = await create(lawyerSession, {
      ...naturalPerson,
      cliente: { tipoPersona: 'fisica' },
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('El DNI es obligatorio para personas físicas');
  });

  it('responde 403 a un cliente y 401 sin sesión (RF-18, RF-19)', async () => {
    await createTestUser(app, {
      rol: 'cliente',
      email: 'cliente@correo.com',
      cliente: { tipoPersona: 'fisica', dni: '20111222' },
    });
    const clientSession = await loginAs(app, 'cliente@correo.com');

    const forbidden = await create(clientSession, naturalPerson);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.message).toBe('No tenés permiso para realizar esta acción');

    await create(null, naturalPerson).expect(401);
  });
});
