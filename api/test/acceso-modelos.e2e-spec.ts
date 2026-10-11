import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables } from './utilidades/fallos-de-prueba.js';
import { clearModelTables, createTestModelo } from './utilidades/modelos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MODELS = '/api/panel/modelos-escritos';
const FORBIDDEN = 'No tenés permiso para realizar esta acción';
// Texto que solo existe en los datos de los modelos: no debe salir por el portal.
const MARK = 'MARCAMODELO7742';

type Method = 'get' | 'post' | 'patch';

const VALID_MODEL = {
  titulo: 'Modelo de acceso',
  tipo: 'oficio',
  texto: 'Señor Director: #CARATULA#',
};

/** RF-50 a RF-53 y RNF de reglas de textos: acceso, autoría y aislamiento de los modelos. */
describe('acceso a los modelos de escritos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let client: Usuario;
  let lawyerSession: TestSession;
  let clientSession: TestSession;
  let pendingSession: TestSession;
  let modeloId: number;
  let causaId: number;

  /** Todos los endpoints de la spec, con un cuerpo válido para que solo decida el acceso. */
  const endpoints = (): [Method, string, object?][] => [
    ['get', MODELS],
    ['get', `${MODELS}/${modeloId}`],
    ['post', MODELS, VALID_MODEL],
    ['patch', `${MODELS}/${modeloId}`, { descripcion: 'Cambio' }],
    ['post', `${MODELS}/${modeloId}/desactivar`],
    ['post', `${MODELS}/${modeloId}/reactivar`],
    ['get', `/api/panel/causas/${causaId}/escritos/${modeloId}`],
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
    await clearModelTables(app);
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

    modeloId = (
      await createTestModelo(app, {
        creadoPorId: lawyer.id,
        titulo: `Modelo ${MARK}`,
        descripcion: `Descripción ${MARK}`,
        texto: `Texto interno ${MARK}: #CARATULA# de #CLIENTES_CON_DOCUMENTO#.`,
      })
    ).id;
    // El cliente es parte de una causa con un movimiento visible: tiene qué ver en el portal,
    // y un escrito de esa causa llevaría sus datos.
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

  it('un visitante sin sesión recibe 401 en cada endpoint (RF-50)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body);
      expect(response.status, `${method} ${path}`).toBe(401);
      expect(JSON.stringify(response.body), `${method} ${path}`).not.toContain(MARK);
    }
  });

  it('un cliente recibe 403 en cada endpoint, sin datos de modelos ni de escritos (RF-50, RF-52)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body, clientSession);
      expect(response.status, `${method} ${path}`).toBe(403);
      expect(response.body.message, `${method} ${path}`).toBe(FORBIDDEN);
      expect(JSON.stringify(response.body), `${method} ${path}`).not.toContain(MARK);
    }
  });

  it('un integrante con cambio de contraseña pendiente recibe 403 en cada endpoint (RF-50)', async () => {
    for (const [method, path, body] of endpoints()) {
      const response = await call(method, path, body, pendingSession);
      expect(response.status, `${method} ${path}`).toBe(403);
      expect(JSON.stringify(response.body), `${method} ${path}`).not.toContain(MARK);
    }
  });

  it('ningún intento rechazado modificó el modelo ni cargó otro', async () => {
    const detail = await call('get', `${MODELS}/${modeloId}`, undefined, lawyerSession).expect(200);
    expect(detail.body).toMatchObject({ activo: true, modificadoPor: null });

    const list = await call('get', MODELS, undefined, lawyerSession).expect(200);
    expect(list.body.items).toHaveLength(1);
  });

  it('un abogado y un administrador sí usan cada endpoint (RF-50)', async () => {
    const admin = await createTestUser(app, { rol: 'admin', email: 'admin@estudio.com' });
    const adminSession = await loginAs(app, admin.email!);

    for (const session of [lawyerSession, adminSession]) {
      await call('get', MODELS, undefined, session).expect(200);
      await call('get', `${MODELS}/${modeloId}`, undefined, session).expect(200);
      await call(
        'get',
        `/api/panel/causas/${causaId}/escritos/${modeloId}`,
        undefined,
        session,
      ).expect(200);
    }
  });

  it('las respuestas del portal de un cliente no tienen datos de modelos ni de escritos (RF-52)', async () => {
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
      expect(json, path).not.toMatch(/modelo|variables|faltantes|clientesDesactivados/i);
    }
  });

  it('el portal no tiene ninguna ruta de modelos ni de escritos (RF-52)', async () => {
    for (const path of [
      '/api/portal/modelos-escritos',
      `/api/portal/modelos-escritos/${modeloId}`,
      `/api/portal/causas/${causaId}/escritos/${modeloId}`,
    ]) {
      const response = await call('get', path, undefined, clientSession);
      expect(response.status, path).toBe(404);
      expect(JSON.stringify(response.body), path).not.toContain(MARK);
    }
  });

  it('un autor desactivado sigue figurando, marcado como desactivado (RF-51)', async () => {
    const author = await createTestUser(app, {
      email: 'marta@estudio.com',
      nombre: 'Marta',
      apellido: 'Díaz',
    });
    const authorSession = await loginAs(app, author.email!);
    const created = await call(
      'post',
      MODELS,
      { ...VALID_MODEL, titulo: 'Modelo de Marta' },
      authorSession,
    ).expect(201);
    await call(
      'patch',
      `${MODELS}/${created.body.id}`,
      { descripcion: 'Descripción corregida' },
      authorSession,
    ).expect(200);

    await app.get(DataSource).getRepository(Usuario).update(author.id, { activo: false });

    const detail = await call(
      'get',
      `${MODELS}/${created.body.id}`,
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
    // Su modelo se sigue usando.
    await call(
      'get',
      `/api/panel/causas/${causaId}/escritos/${created.body.id}`,
      undefined,
      lawyerSession,
    ).expect(200);
    // Ella ya no puede usar los modelos.
    await call('get', MODELS, undefined, authorSession).expect(401);
  });

  describe('las reglas de las otras specs no cambian (RNF de reglas de textos)', () => {
    it('una causa con @ en la carátula se sigue rechazando (spec 002)', async () => {
      const response = await call(
        'patch',
        `/api/panel/causas/${causaId}`,
        { caratula: 'Pérez c/ estudio@ejemplo.com' },
        lawyerSession,
      ).expect(400);

      expect(JSON.stringify(response.body.message)).toContain('La carátula solo puede tener');
    });

    it('un movimiento con @ en la descripción se sigue rechazando (spec 003)', async () => {
      const response = await call(
        'post',
        `/api/panel/causas/${causaId}/movimientos`,
        { fecha: '2024-03-01', tipo: 'providencia', descripcion: 'Avisar a estudio@ejemplo.com' },
        lawyerSession,
      ).expect(400);

      expect(JSON.stringify(response.body.message)).toContain('La descripción solo puede tener');
    });

    it('un fallo con @ en el sumario se sigue rechazando (spec 005)', async () => {
      const response = await call(
        'post',
        '/api/panel/jurisprudencia',
        {
          caratula: 'Pérez c/ López',
          tribunal: 'CNCiv., Sala A',
          fuero: 'civil',
          fecha: '2019-05-03',
          sumario: 'Ver estudio@ejemplo.com',
          palabrasClave: ['acceso'],
        },
        lawyerSession,
      ).expect(400);

      expect(JSON.stringify(response.body.message)).toContain('El sumario solo puede tener');
    });

    it('el mismo texto sí se acepta en el texto de un modelo (RF-4)', async () => {
      const response = await call(
        'post',
        MODELS,
        { ...VALID_MODEL, titulo: 'Modelo con email', texto: 'Avisar a estudio@ejemplo.com' },
        lawyerSession,
      ).expect(201);

      expect(response.body.texto).toBe('Avisar a estudio@ejemplo.com');
    });

    it('las respuestas de modelos no llevan datos de jurisprudencia (RF-53)', async () => {
      const detail = await call('get', `${MODELS}/${modeloId}`, undefined, lawyerSession).expect(
        200,
      );
      const escrito = await call(
        'get',
        `/api/panel/causas/${causaId}/escritos/${modeloId}`,
        undefined,
        lawyerSession,
      ).expect(200);

      for (const body of [detail.body, escrito.body]) {
        expect(JSON.stringify(body)).not.toMatch(/sumario|palabrasClave|tribunal|enlace/i);
      }
    });
  });
});
