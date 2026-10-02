import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Sesion } from '../src/usuarios/sesion.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { cookieWasCleared, loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const OWN_USER = '/api/sesion/usuario';
const LOGOUT = '/api/sesion/cerrar';
const REFRESH = '/api/sesion/renovar';

describe('sesión: usuario propio, cierre y sesión única', () => {
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

  const server = () => app.getHttpServer();
  const getOwnUser = (session?: TestSession) => {
    const call = request(server()).get(OWN_USER);
    return session ? call.set('Cookie', `access_token=${session.accessToken}`) : call;
  };
  const refresh = (session: TestSession) =>
    request(server()).post(REFRESH).set('Cookie', `refresh_token=${session.refreshToken}`);

  describe('GET /api/sesion/usuario (RF-35)', () => {
    it('devuelve los datos propios, sin el hash de la contraseña', async () => {
      const usuario = await createTestUser(app);
      const session = await loginAs(app, 'juan@estudio.com');

      const response = await getOwnUser(session);

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

    it('incluye los datos de cliente de una persona jurídica', async () => {
      await createTestUser(app, {
        rol: 'cliente',
        email: 'contacto@empresa.com',
        nombre: 'Laura',
        apellido: 'Sosa',
        cliente: {
          tipoPersona: 'juridica',
          cuit: '30712345671',
          razonSocial: 'Empresa S.A.',
          domicilio: 'San Martín 123',
        },
      });
      const session = await loginAs(app, 'contacto@empresa.com');

      const response = await getOwnUser(session).expect(200);

      expect(response.body.cliente).toEqual({
        tipoPersona: 'juridica',
        dni: null,
        cuit: '30712345671',
        razonSocial: 'Empresa S.A.',
        telefono: null,
        domicilio: 'San Martín 123',
      });
    });

    it('está permitida con el cambio de contraseña pendiente (RF-11)', async () => {
      await createTestUser(app, { debeCambiarContrasena: true });
      const session = await loginAs(app, 'juan@estudio.com');

      const response = await getOwnUser(session).expect(200);

      expect(response.body.debeCambiarContrasena).toBe(true);
    });

    it('responde 401 sin sesión (RF-18)', async () => {
      await getOwnUser().expect(401);
    });
  });

  describe('POST /api/sesion/cerrar (RF-16)', () => {
    it('cierra la sesión, borra las cookies y deja los tokens sin efecto', async () => {
      await createTestUser(app);
      const session = await loginAs(app, 'juan@estudio.com');

      const response = await request(server())
        .post(LOGOUT)
        .set('Cookie', [
          `access_token=${session.accessToken}`,
          `refresh_token=${session.refreshToken}`,
        ]);

      expect(response.status).toBe(204);
      expect(cookieWasCleared(response, 'access_token')).toBe(true);
      expect(cookieWasCleared(response, 'refresh_token')).toBe(true);
      const [stored] = await app.get(DataSource).getRepository(Sesion).find();
      expect(stored.revocadaEn).toBeInstanceOf(Date);
      await getOwnUser(session).expect(401);
      await refresh(session).expect(401);
    });

    it('funciona aunque el token de acceso haya vencido (solo con la cookie de renovación)', async () => {
      await createTestUser(app);
      const session = await loginAs(app, 'juan@estudio.com');

      await request(server())
        .post(LOGOUT)
        .set('Cookie', `refresh_token=${session.refreshToken}`)
        .expect(204);

      await refresh(session).expect(401);
    });

    it('sin cookies igual responde 204 y las borra', async () => {
      const response = await request(server()).post(LOGOUT);

      expect(response.status).toBe(204);
      expect(cookieWasCleared(response, 'refresh_token')).toBe(true);
    });

    it('no cierra la sesión si el secreto no corresponde', async () => {
      await createTestUser(app);
      const session = await loginAs(app, 'juan@estudio.com');
      const sessionId = session.refreshToken.split('.')[0];

      await request(server())
        .post(LOGOUT)
        .set('Cookie', `refresh_token=${sessionId}.secreto-inventado`)
        .expect(204);

      await getOwnUser(session).expect(200);
    });
  });

  describe('sesión única (RF-13)', () => {
    it('un segundo ingreso deja sin efecto la sesión del primer dispositivo', async () => {
      await createTestUser(app);
      const firstDevice = await loginAs(app, 'juan@estudio.com');
      await getOwnUser(firstDevice).expect(200);

      const secondDevice = await loginAs(app, 'juan@estudio.com');

      await getOwnUser(firstDevice).expect(401);
      await refresh(firstDevice).expect(401);
      await getOwnUser(secondDevice).expect(200);
    });
  });
});
