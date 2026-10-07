import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const FORBIDDEN = 'No tenés permiso para realizar esta acción';

type Method = 'get' | 'post' | 'patch';

/** RF-35, RF-36: acceso a los movimientos y autores desactivados. */
describe('acceso a los movimientos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let client: Usuario;
  let clientSession: TestSession;
  let lawyerSession: TestSession;
  let causaId: number;
  let movimientoId: number;

  const movements = () => `/api/panel/causas/${causaId}/movimientos`;

  /** Todos los endpoints de la spec, con un cuerpo válido para que solo decida el acceso. */
  const endpoints = (): [Method, string, object?][] => [
    ['get', movements()],
    ['get', `${movements()}/${movimientoId}`],
    ['post', movements(), { fecha: '2024-03-01', tipo: 'providencia', descripcion: 'Texto.' }],
    ['patch', `${movements()}/${movimientoId}`, { visible: true }],
    ['post', `${movements()}/${movimientoId}/anular`],
    ['post', `${movements()}/${movimientoId}/restaurar`],
  ];

  const call = (method: Method, path: string, body?: object, session?: TestSession) => {
    let test = request(app.getHttpServer())[method](path);
    if (session) test = test.set('Cookie', `access_token=${session.accessToken}`);
    return body ? test.send(body) : test;
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, {
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Álvarez',
    });
    client = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    clientSession = await loginAs(app, client.email!);
    lawyerSession = await loginAs(app, lawyer.email!);
    // El cliente es parte de la causa: ni siquiera así accede a los movimientos del panel.
    causaId = (
      await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ clienteId: client.id }],
      })
    ).id;
    movimientoId = (
      await createTestMovimiento(app, { causaId, creadoPorId: lawyer.id, visible: true })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('un visitante sin sesión recibe 401 en cada endpoint (RF-35)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body);
      expect(response.status, `${method} ${path}`).toBe(401);
    }
  });

  it('un cliente, aunque sea parte de la causa, recibe 403 en cada endpoint (RF-35)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body, clientSession);
      expect(response.status, `${method} ${path}`).toBe(403);
      expect(response.body.message, `${method} ${path}`).toBe(FORBIDDEN);
    }
  });

  it('un autor desactivado sigue figurando, marcado como desactivado (RF-36)', async () => {
    const author = await createTestUser(app, {
      email: 'marta@estudio.com',
      nombre: 'Marta',
      apellido: 'Díaz',
    });
    const authorSession = await loginAs(app, author.email!);
    const created = await call(
      'post',
      movements(),
      { fecha: '2024-05-01', tipo: 'oficio', descripcion: 'Se libró oficio.' },
      authorSession,
    ).expect(201);
    await call(
      'patch',
      `${movements()}/${created.body.id}`,
      { visible: true },
      authorSession,
    ).expect(200);

    await app.get(DataSource).getRepository(Usuario).update(author.id, { activo: false });

    const detail = await call(
      'get',
      `${movements()}/${created.body.id}`,
      undefined,
      lawyerSession,
    ).expect(200);
    expect(detail.body.creadoPor).toMatchObject({ id: author.id, nombre: 'Marta', activo: false });
    expect(detail.body.modificadoPor).toMatchObject({ id: author.id, activo: false });
    for (const cambio of detail.body.cambios) {
      expect(cambio.usuario).toMatchObject({ id: author.id, activo: false });
    }

    const list = await call('get', movements(), undefined, lawyerSession).expect(200);
    const row = list.body.items.find((item: { id: number }) => item.id === created.body.id);
    expect(row.creadoPor).toMatchObject({ id: author.id, activo: false });
  });
});
