import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables, createTestFallo } from './utilidades/fallos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = '/api/panel/jurisprudencia';

/** RF-19, RF-30, RF-33: consulta de un fallo. */
describe('consulta de un fallo', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let admin: Usuario;
  let session: TestSession;
  let falloId: number;
  let deactivatedId: number;

  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set('Cookie', `access_token=${session.accessToken}`);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearRulingTables(app);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    admin = await createTestUser(app, {
      rol: 'admin',
      email: 'admin@estudio.com',
      nombre: 'Ana',
      apellido: 'Sabalette',
    });
    session = await loginAs(app, lawyer.email!);

    falloId = (
      await createTestFallo(app, {
        creadoPorId: lawyer.id,
        numero: '1234/2018',
        sumario: 'Primer párrafo.\n\nSegundo párrafo.',
        enlace: 'https://www.csjn.gov.ar/fallos/1234',
        palabrasClave: ['responsabilidad objetiva', 'daño moral'],
        modificadoPorId: admin.id,
        modificadoEn: new Date(),
      })
    ).id;
    deactivatedId = (
      await createTestFallo(app, {
        creadoPorId: admin.id,
        caratula: 'Gómez c/ Seguros SA',
        activo: false,
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('devuelve el fallo con sus datos, palabras clave, enlace y autoría (RF-19)', async () => {
    const response = await get(`${RULINGS}/${falloId}`).expect(200);

    expect(response.body).toMatchObject({
      id: falloId,
      caratula: 'Pérez c/ López s/ daños',
      tribunal: 'CNCiv., Sala A',
      fuero: 'civil',
      fecha: '2019-05-03',
      numero: '1234/2018',
      sumario: 'Primer párrafo.\n\nSegundo párrafo.',
      enlace: 'https://www.csjn.gov.ar/fallos/1234',
      activo: true,
      creadoPor: { id: lawyer.id, nombre: 'Luis', apellido: 'Sosa', activo: true },
      modificadoPor: { id: admin.id, nombre: 'Ana', apellido: 'Sabalette', activo: true },
    });
    expect(response.body.palabrasClave.map((palabra: { texto: string }) => palabra.texto)).toEqual([
      'daño moral',
      'responsabilidad objetiva',
    ]);
    expect(response.body.creadoEn).toEqual(expect.any(String));
    expect(response.body.modificadoEn).toEqual(expect.any(String));
  });

  it('la respuesta no incluye la clave del catálogo, emails ni hashes', async () => {
    const response = await get(`${RULINGS}/${falloId}`).expect(200);
    const json = JSON.stringify(response.body);

    expect(json).not.toContain('@estudio.com');
    expect(json).not.toContain('contrasenaHash');
    expect(json).not.toContain('"clave"');
    expect(json).not.toContain('numeroBusqueda');
  });

  it('también devuelve un fallo desactivado, identificado como tal (RF-30)', async () => {
    const response = await get(`${RULINGS}/${deactivatedId}`).expect(200);

    expect(response.body).toMatchObject({
      id: deactivatedId,
      caratula: 'Gómez c/ Seguros SA',
      activo: false,
      numero: null,
      enlace: null,
      modificadoPor: null,
      modificadoEn: null,
    });
  });

  it.each([
    ['un id inexistente', '999999'],
    ['un id que no es un número', 'abc'],
    ['un id con decimales', '1.5'],
  ])('responde 404 "No existe ese fallo" con %s (RF-33)', async (_case, id) => {
    const response = await get(`${RULINGS}/${id}`).expect(404);
    expect(response.body.message).toBe('No existe ese fallo');
  });

  it('toda respuesta lleva Cache-Control: no-store', async () => {
    const response = await get(`${RULINGS}/${falloId}`).expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
