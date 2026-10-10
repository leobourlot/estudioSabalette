import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables, createTestFallo } from './utilidades/fallos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = '/api/panel/jurisprudencia';
const FORBIDDEN = 'No tenés permiso para realizar esta acción';
// Texto que solo existe en los datos de jurisprudencia: no debe salir por el portal.
const MARK = 'MARCAJURIS9911';

type Method = 'get' | 'post' | 'patch';

const VALID_RULING = {
  caratula: 'Carátula de acceso',
  tribunal: 'CNCiv., Sala A',
  fuero: 'civil',
  fecha: '2019-05-03',
  sumario: 'Sumario.',
  palabrasClave: ['acceso'],
};

/** RF-34 a RF-36 y RNF de reglas propias: acceso, autoría y aislamiento de la jurisprudencia. */
describe('acceso a la jurisprudencia', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let client: Usuario;
  let lawyerSession: TestSession;
  let clientSession: TestSession;
  let pendingSession: TestSession;
  let falloId: number;
  let causaId: number;

  /** Todos los endpoints de la spec, con un cuerpo válido para que solo decida el acceso. */
  const endpoints = (): [Method, string, object?][] => [
    ['get', RULINGS],
    ['get', `${RULINGS}/palabras-clave?buscar=da`],
    ['get', `${RULINGS}/${falloId}`],
    ['post', RULINGS, VALID_RULING],
    ['patch', `${RULINGS}/${falloId}`, { sumario: 'Cambio.' }],
    ['post', `${RULINGS}/${falloId}/desactivar`],
    ['post', `${RULINGS}/${falloId}/reactivar`],
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
    await clearRulingTables(app);
    lawyer = await createTestUser(app, {
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Álvarez',
    });
    client = await createTestClient(app);
    const pending = await createTestUser(app, {
      email: 'nuevo@estudio.com',
      nombre: 'Nuevo',
      apellido: 'Integrante',
      debeCambiarContrasena: true,
    });
    lawyerSession = await loginAs(app, lawyer.email!);
    clientSession = await loginAs(app, client.email!);
    pendingSession = await loginAs(app, pending.email!);

    falloId = (
      await createTestFallo(app, {
        creadoPorId: lawyer.id,
        caratula: `${MARK} c/ López`,
        sumario: `Sumario interno ${MARK}.`,
        palabrasClave: [`palabra ${MARK}`],
      })
    ).id;
    // El cliente es parte de una causa con un movimiento visible: tiene qué ver en el portal.
    causaId = (
      await createTestCausa(app, {
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [{ clienteId: client.id }],
      })
    ).id;
    await createTestMovimiento(app, { causaId, creadoPorId: lawyer.id, visible: true });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('un visitante sin sesión recibe 401 en cada endpoint (RF-34)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body);
      expect(response.status, `${method} ${path}`).toBe(401);
    }
  });

  it('un cliente recibe 403 en cada endpoint, sin datos de jurisprudencia (RF-34, RF-36)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body, clientSession);
      expect(response.status, `${method} ${path}`).toBe(403);
      expect(response.body.message, `${method} ${path}`).toBe(FORBIDDEN);
      expect(JSON.stringify(response.body), `${method} ${path}`).not.toContain(MARK);
    }
  });

  it('un integrante con cambio de contraseña pendiente recibe 403 en cada endpoint (RF-34)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body, pendingSession);
      expect(response.status, `${method} ${path}`).toBe(403);
      expect(JSON.stringify(response.body), `${method} ${path}`).not.toContain(MARK);
    }
  });

  it('ningún intento rechazado modificó el fallo ni cargó otro', async () => {
    const detail = await call('get', `${RULINGS}/${falloId}`, undefined, lawyerSession).expect(200);
    expect(detail.body).toMatchObject({ activo: true, modificadoPor: null });

    const list = await call('get', RULINGS, undefined, lawyerSession).expect(200);
    expect(list.body.items).toHaveLength(1);
  });

  it('las respuestas del portal de un cliente no tienen datos de jurisprudencia (RF-36)', async () => {
    const paths = [
      '/api/portal/causas',
      `/api/portal/causas/${causaId}`,
      `/api/portal/causas/${causaId}/movimientos`,
      '/api/sesion/usuario',
    ];

    for (const path of paths) {
      const response = await call('get', path, undefined, clientSession).expect(200);
      const json = JSON.stringify(response.body);
      expect(json, path).not.toContain(MARK);
      expect(json, path).not.toMatch(/sumario|palabrasClave|jurisprudencia|fallo/i);
    }
  });

  it('un autor desactivado sigue figurando, marcado como desactivado (RF-35)', async () => {
    const author = await createTestUser(app, {
      email: 'marta@estudio.com',
      nombre: 'Marta',
      apellido: 'Díaz',
    });
    const authorSession = await loginAs(app, author.email!);
    const created = await call(
      'post',
      RULINGS,
      { ...VALID_RULING, caratula: 'Fallo de Marta' },
      authorSession,
    ).expect(201);
    await call(
      'patch',
      `${RULINGS}/${created.body.id}`,
      { sumario: 'Sumario corregido.' },
      authorSession,
    ).expect(200);

    await app.get(DataSource).getRepository(Usuario).update(author.id, { activo: false });

    const detail = await call(
      'get',
      `${RULINGS}/${created.body.id}`,
      undefined,
      lawyerSession,
    ).expect(200);
    expect(detail.body.creadoPor).toEqual({
      id: author.id,
      nombre: 'Marta',
      apellido: 'Díaz',
      activo: false,
    });
    expect(detail.body.modificadoPor).toMatchObject({ id: author.id, activo: false });
    // Ya no puede usar la jurisprudencia.
    await call('get', RULINGS, undefined, authorSession).expect(401);
  });

  describe('las reglas de las otras specs no cambian (RNF de reglas propias)', () => {
    it('una causa con comillas tipográficas en la carátula se sigue rechazando (spec 002)', async () => {
      const response = await call(
        'patch',
        `/api/panel/causas/${causaId}`,
        { caratula: '“Pérez” c/ López – s/ daños' },
        lawyerSession,
      ).expect(400);

      expect(JSON.stringify(response.body.message)).toContain('La carátula solo puede tener');
    });

    it('un movimiento con comillas tipográficas en la descripción se sigue rechazando (spec 003)', async () => {
      const response = await call(
        'post',
        `/api/panel/causas/${causaId}/movimientos`,
        { fecha: '2024-03-01', tipo: 'providencia', descripcion: '“Se fija audiencia…”' },
        lawyerSession,
      ).expect(400);

      expect(JSON.stringify(response.body.message)).toContain('La descripción solo puede tener');
    });

    it('los mismos textos sí se aceptan, convertidos, en un fallo (spec 005, RF-3)', async () => {
      const response = await call(
        'post',
        RULINGS,
        {
          ...VALID_RULING,
          caratula: '“Pérez” c/ López – s/ daños',
          sumario: '“Se fija audiencia…”',
        },
        lawyerSession,
      ).expect(201);

      expect(response.body.caratula).toBe('"Pérez" c/ López - s/ daños');
      expect(response.body.sumario).toBe('"Se fija audiencia..."');
    });
  });
});
