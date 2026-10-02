import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const USERS = '/api/panel/usuarios';

/** Nombre que se ve en el listado: razón social o apellido. */
const displayName = (item: { apellido: string; cliente: { razonSocial: string | null } | null }) =>
  item.cliente?.razonSocial ?? item.apellido;

describe('GET /api/panel/usuarios (listado y consulta)', () => {
  let app: NestExpressApplication;
  let principal: Usuario;
  let lawyer: Usuario;
  let gomez: Usuario;
  let adminSession: TestSession;
  let lawyerSession: TestSession;
  let clientSession: TestSession;

  // Los datos no cambian entre tests: se cargan una sola vez.
  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    principal = await createTestUser(app, {
      rol: 'admin',
      esPrincipal: true,
      email: 'principal@estudio.com',
      nombre: 'Carla',
      apellido: 'Sabalette',
    });
    lawyer = await createTestUser(app, {
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Pérez',
    });
    gomez = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      creadoPorId: lawyer.id,
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    await createTestUser(app, {
      rol: 'cliente',
      email: 'bruno@correo.com',
      nombre: 'Bruno',
      apellido: 'Álvarez',
      activo: false,
      cliente: { tipoPersona: 'fisica', dni: '28999888' },
    });
    await createTestUser(app, {
      rol: 'cliente',
      email: 'laura@zeta.com',
      nombre: 'Laura',
      apellido: 'Sosa',
      cliente: { tipoPersona: 'juridica', cuit: '30712345671', razonSocial: 'Zeta S.A.' },
    });
    await createTestUser(app, {
      rol: 'cliente',
      email: 'pedro@acme.com',
      nombre: 'Pedro',
      apellido: 'Ruiz',
      cliente: { tipoPersona: 'juridica', cuit: '33693450239', razonSocial: 'Acme SRL' },
    });

    adminSession = await loginAs(app, 'principal@estudio.com');
    lawyerSession = await loginAs(app, 'juan@estudio.com');
    clientSession = await loginAs(app, 'ana@correo.com');
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  const get = (session: TestSession | null, path: string) => {
    const call = request(app.getHttpServer()).get(path);
    return session ? call.set('Cookie', `access_token=${session.accessToken}`) : call;
  };
  const list = (session: TestSession, query = '') => get(session, `${USERS}${query}`);

  describe('listado (RF-26)', () => {
    it('ordena alfabéticamente por apellido o razón social, sin distinguir tildes', async () => {
      const response = await list(adminSession).expect(200);

      expect(response.body).toMatchObject({ total: 6, pagina: 1, porPagina: 20 });
      expect(response.body.items.map(displayName)).toEqual([
        'Acme SRL',
        'Álvarez',
        'Gómez',
        'Pérez',
        'Sabalette',
        'Zeta S.A.',
      ]);
    });

    it.each([
      ['apellido sin tilde', 'gomez', ['Gómez']],
      ['nombre', 'juan', ['Pérez']],
      ['razón social', 'acme', ['Acme SRL']],
      ['DNI con puntos', '30.123.456', ['Gómez']],
      ['parte del DNI', '28.999', ['Álvarez']],
      ['CUIT con guiones', '30-71234567-1', ['Zeta S.A.']],
    ])('busca por %s', async (_case, term, expected) => {
      const response = await list(adminSession, `?buscar=${encodeURIComponent(term)}`).expect(200);

      expect(response.body.items.map(displayName)).toEqual(expected);
    });

    it('trata los comodines de la búsqueda como texto', async () => {
      const response = await list(adminSession, `?buscar=${encodeURIComponent('%')}`).expect(200);

      expect(response.body.items).toEqual([]);
    });

    it('filtra por rol y por estado', async () => {
      const lawyers = await list(adminSession, '?rol=abogado').expect(200);
      expect(lawyers.body.items.map(displayName)).toEqual(['Pérez']);

      const inactive = await list(adminSession, '?activo=false').expect(200);
      expect(inactive.body.items.map(displayName)).toEqual(['Álvarez']);
    });

    it('un abogado solo ve cuentas de clientes', async () => {
      const response = await list(lawyerSession).expect(200);

      expect(response.body.total).toBe(4);
      expect(response.body.items.every((item: { rol: string }) => item.rol === 'cliente')).toBe(
        true,
      );
    });

    it('un abogado que pide otro rol recibe 403', async () => {
      const response = await list(lawyerSession, '?rol=abogado');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('No tenés permiso para realizar esta acción');
    });

    it('responde 400 con parámetros inválidos', async () => {
      const response = await list(adminSession, '?pagina=0');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        'La página debe ser un número entero mayor o igual a 1',
      );
    });

    it('responde 401 sin sesión y 403 a un cliente (RF-18, RF-19)', async () => {
      await get(null, USERS).expect(401);
      await list(clientSession).expect(403);
    });
  });

  describe('paginado (RF-26)', () => {
    it('muestra de a 20 por página', async () => {
      for (let i = 0; i < 20; i++) {
        await createTestUser(app, {
          rol: 'cliente',
          email: `extra${i}@correo.com`,
          nombre: 'Extra',
          apellido: `Navarro ${String(i).padStart(2, '0')}`,
          cliente: { tipoPersona: 'fisica', dni: String(40000000 + i) },
        });
      }

      const first = await list(adminSession).expect(200);
      const second = await list(adminSession, '?pagina=2').expect(200);

      expect(first.body.total).toBe(26);
      expect(first.body.items).toHaveLength(20);
      expect(second.body).toMatchObject({ pagina: 2, total: 26 });
      expect(second.body.items.map(displayName)).toEqual([
        'Navarro 17',
        'Navarro 18',
        'Navarro 19',
        'Pérez',
        'Sabalette',
        'Zeta S.A.',
      ]);
    }, 60_000);
  });

  describe('consulta de una cuenta (RF-34)', () => {
    it('muestra los datos y la auditoría', async () => {
      const response = await get(lawyerSession, `${USERS}/${gomez.id}`).expect(200);

      expect(response.body).toMatchObject({
        id: gomez.id,
        rol: 'cliente',
        apellido: 'Gómez',
        activo: true,
        creadoPor: { id: lawyer.id, nombre: 'Juan', apellido: 'Pérez' },
        modificadoPor: null,
        cliente: { tipoPersona: 'fisica', dni: '30123456' },
      });
      expect(response.body).toHaveProperty('ultimoIngreso');
      expect(JSON.stringify(response.body)).not.toContain('$2b$');
    });

    it('un abogado no puede consultar a un integrante', async () => {
      const response = await get(lawyerSession, `${USERS}/${principal.id}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('No tenés permiso para realizar esta acción');
    });

    it('un administrador consulta cualquier cuenta', async () => {
      await get(adminSession, `${USERS}/${lawyer.id}`).expect(200);
    });

    it.each(['999999', 'abc'])('responde 404 si la cuenta %s no existe', async (id) => {
      const response = await get(adminSession, `${USERS}/${id}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No existe esa cuenta');
    });
  });
});
