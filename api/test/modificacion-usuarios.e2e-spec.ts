import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser, TEST_PASSWORD } from './utilidades/datos-de-prueba.js';
import { loginAs, nextTestIp, type TestSession } from './utilidades/sesion-de-prueba.js';

const USERS = '/api/panel/usuarios';

describe('PATCH /api/panel/usuarios/:id (modificación)', () => {
  let app: NestExpressApplication;
  let principal: Usuario;
  let admin: Usuario;
  let lawyer: Usuario;
  let naturalClient: Usuario;
  let legalClient: Usuario;
  let principalSession: TestSession;
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
    admin = await createTestUser(app, {
      rol: 'admin',
      email: 'admin@estudio.com',
      nombre: 'Mario',
      apellido: 'Rossi',
    });
    lawyer = await createTestUser(app, { email: 'juan@estudio.com' });
    naturalClient = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456', telefono: '3415551234' },
    });
    legalClient = await createTestUser(app, {
      rol: 'cliente',
      email: 'laura@zeta.com',
      nombre: 'Laura',
      apellido: 'Sosa',
      cliente: { tipoPersona: 'juridica', cuit: '30712345671', razonSocial: 'Zeta S.A.' },
    });
    principalSession = await loginAs(app, 'principal@estudio.com');
    adminSession = await loginAs(app, 'admin@estudio.com');
    lawyerSession = await loginAs(app, 'juan@estudio.com');
  }, 60_000);

  const withAccess = (call: request.Test, session: TestSession) =>
    call.set('Cookie', `access_token=${session.accessToken}`);
  const update = (session: TestSession, id: number, body: object) =>
    withAccess(request(app.getHttpServer()).patch(`${USERS}/${id}`), session).send(body);
  const ownUser = (session: TestSession) =>
    withAccess(request(app.getHttpServer()).get('/api/sesion/usuario'), session);
  const listStaff = (session: TestSession) =>
    withAccess(request(app.getHttpServer()).get(`${USERS}?rol=abogado`), session);

  it('guarda los cambios y registra quién modificó la cuenta (RF-27)', async () => {
    const response = await update(adminSession, naturalClient.id, {
      nombre: 'Ana María',
      cliente: { domicilio: 'Córdoba 456' },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      nombre: 'Ana María',
      apellido: 'Gómez',
      cliente: { dni: '30123456', telefono: '3415551234', domicilio: 'Córdoba 456' },
      modificadoPor: { id: admin.id, nombre: 'Mario', apellido: 'Rossi' },
    });
    expect(typeof response.body.modificadoEn).toBe('string');
  });

  it('permite borrar el teléfono con null', async () => {
    const response = await update(lawyerSession, naturalClient.id, { cliente: { telefono: null } });

    expect(response.status).toBe(200);
    expect(response.body.cliente.telefono).toBeNull();
  });

  it('modifica la razón social de una persona jurídica', async () => {
    const response = await update(lawyerSession, legalClient.id, {
      cliente: { razonSocial: 'Zeta Argentina S.A.' },
    });

    expect(response.status).toBe(200);
    expect(response.body.cliente.razonSocial).toBe('Zeta Argentina S.A.');
  });

  describe('email', () => {
    it('al cambiar el email de otra cuenta, cierra su sesión (RF-27)', async () => {
      await update(adminSession, lawyer.id, { email: 'juan.perez@estudio.com' }).expect(200);

      await ownUser(lawyerSession).expect(401);
      await request(app.getHttpServer())
        .post('/api/sesion/ingresar')
        .set('X-Forwarded-For', nextTestIp())
        .send({ email: 'juan.perez@estudio.com', contrasena: TEST_PASSWORD })
        .expect(200);
    });

    it('si un administrador cambia su propio email, su sesión sigue', async () => {
      await update(adminSession, admin.id, { email: 'mario@estudio.com' }).expect(200);

      const response = await ownUser(adminSession).expect(200);
      expect(response.body.email).toBe('mario@estudio.com');
    });

    it('guardar el mismo email no cierra la sesión', async () => {
      await update(adminSession, lawyer.id, { email: 'JUAN@estudio.com' }).expect(200);

      await ownUser(lawyerSession).expect(200);
    });

    it('responde 409 si el email ya está en uso (RF-23, RF-24)', async () => {
      const taken = await update(adminSession, lawyer.id, { email: 'ana@correo.com' });
      expect(taken.status).toBe(409);
      expect(taken.body.message).toBe('Ya existe una cuenta con ese email');

      await createTestUser(app, { email: 'ex@estudio.com', activo: false });
      const deactivated = await update(adminSession, lawyer.id, { email: 'ex@estudio.com' });
      expect(deactivated.status).toBe(409);
      expect(deactivated.body.message).toBe('Ese email pertenece a una cuenta desactivada');
    });
  });

  describe('rol (RF-14, RF-28)', () => {
    it('un abogado ascendido a administrador sigue con su sesión y ya tiene los permisos nuevos', async () => {
      await listStaff(lawyerSession).expect(403);

      await update(adminSession, lawyer.id, { rol: 'admin' }).expect(200);

      await ownUser(lawyerSession).expect(200);
      await listStaff(lawyerSession).expect(200);
    });

    it('un administrador pasado a abogado pierde los permisos en la siguiente petición', async () => {
      await listStaff(adminSession).expect(200);

      await update(principalSession, admin.id, { rol: 'abogado' }).expect(200);

      await listStaff(adminSession).expect(403);
    });

    it.each([
      ['un cliente a abogado', () => naturalClient.id, 'abogado'],
      ['un abogado a cliente', () => lawyer.id, 'cliente'],
    ])('rechaza pasar %s', async (_case, id, rol) => {
      const response = await update(adminSession, id(), { rol });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Solo se puede cambiar el rol entre administrador y abogado',
      );
    });
  });

  describe('administrador principal (RF-31)', () => {
    it.each([
      ['el email', { email: 'otro@estudio.com' }],
      ['el rol', { rol: 'abogado' }],
    ])('otro administrador no puede cambiarle %s', async (_case, body) => {
      const response = await update(adminSession, principal.id, body);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('No se puede modificar al administrador principal');
    });

    it('otro administrador sí puede corregirle el nombre', async () => {
      await update(adminSession, principal.id, { nombre: 'Carla Inés' }).expect(200);
    });

    it('el principal no puede quitarse el rol', async () => {
      await update(principalSession, principal.id, { rol: 'abogado' }).expect(409);
    });
  });

  describe('permisos del abogado (RF-21)', () => {
    it('modifica clientes, pero no integrantes ni roles', async () => {
      await update(lawyerSession, naturalClient.id, { apellido: 'Gómez Díaz' }).expect(200);
      await update(lawyerSession, admin.id, { nombre: 'X' }).expect(403);
      await update(lawyerSession, naturalClient.id, { rol: 'abogado' }).expect(403);
    });
  });

  describe('datos de cliente (RF-7)', () => {
    it.each(['dni', 'cuit', 'tipoPersona'])('rechaza modificar %s', async (field) => {
      const response = await update(adminSession, naturalClient.id, { cliente: { [field]: 'x' } });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(`El campo cliente.${field} no está permitido`);
    });

    it('rechaza razón social en una persona física', async () => {
      const response = await update(adminSession, naturalClient.id, {
        cliente: { razonSocial: 'Algo S.A.' },
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('La razón social solo corresponde a personas jurídicas');
    });

    it('rechaza datos de cliente en una cuenta de integrante', async () => {
      const response = await update(adminSession, lawyer.id, { cliente: { telefono: '123' } });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Solo las cuentas de clientes llevan datos de cliente');
    });
  });

  it('responde 404 si la cuenta no existe', async () => {
    const response = await update(adminSession, 999999, { nombre: 'X' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('No existe esa cuenta');
  });
});
