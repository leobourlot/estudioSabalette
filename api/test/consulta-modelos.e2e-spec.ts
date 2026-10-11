import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearModelTables, createTestModelo } from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MODELS = '/api/panel/modelos-escritos';

/** RF-16, RF-26, RF-49: consulta de un modelo. */
describe('consulta de un modelo de escrito', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let admin: Usuario;
  let session: TestSession;
  let modeloId: number;
  let deactivatedId: number;

  const TEXT =
    'Señor Juez:\n\n#ACTORES#, en los autos "#CARATULA#",\ndigo:\n\n#FECHA#. Otra vez: #CARATULA#.';

  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set('Cookie', `access_token=${session.accessToken}`);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearModelTables(app);
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

    modeloId = (
      await createTestModelo(app, {
        creadoPorId: lawyer.id,
        titulo: 'Demanda de daños y perjuicios',
        tipo: 'demanda',
        fuero: 'civil',
        descripcion: 'Para accidentes de tránsito',
        texto: TEXT,
        modificadoPorId: admin.id,
        modificadoEn: new Date(),
      })
    ).id;
    deactivatedId = (
      await createTestModelo(app, {
        creadoPorId: admin.id,
        titulo: 'Cédula vieja',
        tipo: 'cedula',
        texto: 'Texto fijo, sin variables.',
        activo: false,
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('devuelve el modelo con sus datos, su texto, sus variables y su autoría (RF-16)', async () => {
    const response = await get(`${MODELS}/${modeloId}`).expect(200);

    expect(response.body).toMatchObject({
      id: modeloId,
      titulo: 'Demanda de daños y perjuicios',
      tipo: 'demanda',
      fuero: 'civil',
      descripcion: 'Para accidentes de tránsito',
      // Con sus saltos de línea y sus marcas sin reemplazar.
      texto: TEXT,
      variables: ['ACTORES', 'CARATULA', 'FECHA'],
      activo: true,
      creadoPor: { id: lawyer.id, nombre: 'Luis', apellido: 'Sosa', activo: true },
      modificadoPor: { id: admin.id, nombre: 'Ana', apellido: 'Sabalette', activo: true },
    });
    expect(response.body.creadoEn).toEqual(expect.any(String));
    expect(response.body.modificadoEn).toEqual(expect.any(String));
  });

  it('la respuesta tiene solo las claves de la ficha, sin emails ni hashes', async () => {
    const response = await get(`${MODELS}/${modeloId}`).expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [
        'id',
        'titulo',
        'tipo',
        'fuero',
        'descripcion',
        'activo',
        'texto',
        'variables',
        'creadoPor',
        'creadoEn',
        'modificadoPor',
        'modificadoEn',
      ].sort(),
    );
    const json = JSON.stringify(response.body);
    expect(json).not.toContain('@estudio.com');
    expect(json).not.toContain('contrasenaHash');
  });

  it('también devuelve un modelo desactivado, identificado como tal (RF-26)', async () => {
    const response = await get(`${MODELS}/${deactivatedId}`).expect(200);

    expect(response.body).toMatchObject({
      id: deactivatedId,
      titulo: 'Cédula vieja',
      fuero: 'otro',
      descripcion: null,
      texto: 'Texto fijo, sin variables.',
      variables: [],
      activo: false,
      modificadoPor: null,
      modificadoEn: null,
    });
  });

  it.each([
    ['un id inexistente', '999999'],
    ['un id que no es un número', 'abc'],
    ['un id con decimales', '1.5'],
  ])('responde 404 "No existe ese modelo" con %s (RF-49)', async (_case, id) => {
    const response = await get(`${MODELS}/${id}`).expect(404);
    expect(response.body.message).toBe('No existe ese modelo');
  });

  it('toda respuesta lleva Cache-Control: no-store', async () => {
    const response = await get(`${MODELS}/${modeloId}`).expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
