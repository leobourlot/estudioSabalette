import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MEMBERS = '/api/panel/causas/integrantes';

/** RF-29, RF-38: integrantes para elegir responsable, colaboradores y filtrar. */
describe('GET /api/panel/causas/integrantes', () => {
  let app: NestExpressApplication;
  let admin: Usuario;
  let lawyer: Usuario;
  let adminSession: TestSession;
  let lawyerSession: TestSession;
  let clientSession: TestSession;

  const get = (session?: TestSession) => {
    const call = request(app.getHttpServer()).get(MEMBERS);
    return session ? call.set('Cookie', `access_token=${session.accessToken}`) : call;
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    admin = await createTestUser(app, {
      rol: 'admin',
      email: 'carla@estudio.com',
      nombre: 'Carla',
      apellido: 'Sabalette',
    });
    lawyer = await createTestUser(app, {
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Álvarez',
    });
    await createTestUser(app, {
      email: 'bruno@estudio.com',
      nombre: 'Bruno',
      apellido: 'Méndez',
      activo: false,
    });
    const client = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    // Una causa en la base: las utilidades de los e2e también la tienen que poder crear y vaciar.
    await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: admin.id,
      colaboradorIds: [admin.id],
      partes: [{ clienteId: client.id }, { nombre: 'Pedro', apellido: 'López' }],
    });

    adminSession = await loginAs(app, 'carla@estudio.com');
    lawyerSession = await loginAs(app, 'juan@estudio.com');
    clientSession = await loginAs(app, 'ana@correo.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('devuelve administradores y abogados, activos y desactivados, por apellido', async () => {
    const response = await get(lawyerSession).expect(200);

    expect(response.body).toEqual([
      { id: lawyer.id, nombre: 'Juan', apellido: 'Álvarez', rol: 'abogado', activo: true },
      expect.objectContaining({ nombre: 'Bruno', apellido: 'Méndez', activo: false }),
      { id: admin.id, nombre: 'Carla', apellido: 'Sabalette', rol: 'admin', activo: true },
    ]);
  });

  it('no incluye clientes ni emails', async () => {
    const response = await get(adminSession).expect(200);

    expect(response.body.map((member: { rol: string }) => member.rol)).not.toContain('cliente');
    expect(JSON.stringify(response.body)).not.toContain('@');
  });

  it('rechaza a un cliente con 403 (RF-44)', async () => {
    const response = await get(clientSession).expect(403);

    expect(response.body.message).toBe('No tenés permiso para realizar esta acción');
  });

  it('rechaza a un visitante con 401 (RF-44)', async () => {
    await get().expect(401);
  });

  it('vacía las tablas de causas entre suites', async () => {
    await clearTables(app);

    const counts: { total: string }[] = await app
      .get(DataSource)
      .query(
        'SELECT (SELECT COUNT(*) FROM causas) + (SELECT COUNT(*) FROM partes) + (SELECT COUNT(*) FROM causa_colaboradores) AS total',
      );
    expect(Number(counts[0].total)).toBe(0);
  });
});
