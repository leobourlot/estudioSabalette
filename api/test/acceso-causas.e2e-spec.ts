import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';
const FORBIDDEN = 'No tenés permiso para realizar esta acción';

type Method = 'get' | 'post' | 'patch' | 'put';

/** RF-35, RF-44: solo administradores y abogados acceden a las causas, desde el panel. */
describe('acceso a /api/panel/causas', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let outsider: Usuario;
  let client: Usuario;
  let causaId: number;
  let parteId: number;
  let clientSession: TestSession;
  let outsiderSession: TestSession;

  /** Todos los endpoints de la spec, con un cuerpo válido para que solo decida el acceso. */
  const endpoints = (): [Method, string, object?][] => [
    ['get', CAUSAS],
    ['get', `${CAUSAS}/integrantes`],
    ['get', `${CAUSAS}/${causaId}`],
    [
      'post',
      CAUSAS,
      {
        caratula: 'Nueva causa',
        fuero: 'civil',
        responsableId: lawyer.id,
        partes: [{ rol: 'actor', tipoPersona: 'fisica', nombre: 'Marta', apellido: 'Ruiz' }],
      },
    ],
    ['patch', `${CAUSAS}/${causaId}`, { estado: 'paralizada' }],
    ['put', `${CAUSAS}/${causaId}/abogados`, { responsableId: lawyer.id, colaboradorIds: [] }],
    [
      'post',
      `${CAUSAS}/${causaId}/partes`,
      { rol: 'tercero', tipoPersona: 'fisica', nombre: 'Rita', apellido: 'Paz' },
    ],
    ['put', `${CAUSAS}/${causaId}/partes/${parteId}`, { rol: 'otro' }],
    ['post', `${CAUSAS}/${causaId}/partes/${parteId}/desvincular`],
    ['post', `${CAUSAS}/${causaId}/partes/${parteId}/revincular`],
    ['post', `${CAUSAS}/${causaId}/desactivar`],
    ['post', `${CAUSAS}/${causaId}/reactivar`, {}],
  ];

  const call = (method: Method, path: string, body?: object, session?: TestSession) => {
    let test = request(app.getHttpServer())[method](path);
    if (session) test = test.set('Cookie', `access_token=${session.accessToken}`);
    return body ? test.send(body) : test;
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    lawyer = await createTestUser(app, {
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Álvarez',
    });
    outsider = await createTestUser(app, {
      email: 'lucia@estudio.com',
      nombre: 'Lucía',
      apellido: 'Benítez',
    });
    client = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    // El cliente es parte de la causa: aun así no accede a nada del panel.
    const causa = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ nombre: 'Pedro', apellido: 'López' }, { clienteId: client.id }],
    });
    causaId = causa.id;

    clientSession = await loginAs(app, 'ana@correo.com');
    outsiderSession = await loginAs(app, 'lucia@estudio.com');
    const detail = await call('get', `${CAUSAS}/${causaId}`, undefined, outsiderSession).expect(
      200,
    );
    parteId = detail.body.partes[0].id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rechaza con 401 cada endpoint sin sesión (RF-44)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body);
      expect(response.status, `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });

  it('rechaza con 403 cada endpoint a un cliente, aunque sea parte de la causa (RF-44)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body, clientSession);
      expect(response.status, `${method.toUpperCase()} ${path}`).toBe(403);
      expect(response.body.message).toBe(FORBIDDEN);
    }
  });

  it('un integrante que no interviene en la causa la consulta y la edita (RF-35)', async () => {
    const before = await call('get', `${CAUSAS}/${causaId}`, undefined, outsiderSession).expect(
      200,
    );
    expect(before.body.responsable.id).not.toBe(outsider.id);
    expect(before.body.colaboradores).toEqual([]);

    await call('patch', `${CAUSAS}/${causaId}`, { estado: 'archivada' }, outsiderSession).expect(
      200,
    );
    await call(
      'post',
      `${CAUSAS}/${causaId}/partes`,
      { rol: 'tercero', tipoPersona: 'fisica', nombre: 'Rita', apellido: 'Paz' },
      outsiderSession,
    ).expect(201);
    const after = await call(
      'put',
      `${CAUSAS}/${causaId}/abogados`,
      { responsableId: lawyer.id, colaboradorIds: [outsider.id] },
      outsiderSession,
    ).expect(200);

    expect(after.body).toMatchObject({
      estado: 'archivada',
      modificadoPor: { id: outsider.id },
      colaboradores: [expect.objectContaining({ id: outsider.id })],
    });
  });
});
