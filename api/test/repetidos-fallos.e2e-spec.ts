import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables, createTestFallo } from './utilidades/fallos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = '/api/panel/jurisprudencia';
const BY_NUMBER = 'Ya existe un fallo con ese número en ese tribunal';
const BY_CAPTION = 'Ya existe un fallo con esa carátula, tribunal y fecha';

const BASE = {
  caratula: 'Muñoz c/ Clínica del Sur s/ daños',
  tribunal: 'Cámara Civil, Sala B',
  fuero: 'civil',
  fecha: '2020-08-14',
  numero: '5678/2019',
  sumario: 'Responsabilidad médica por falta de consentimiento informado.',
  palabrasClave: ['mala praxis'],
};

/** RF-18: aviso de fallo repetido en la carga. */
describe('aviso de fallo repetido en la carga', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let existingId: number;

  const post = (body: object) =>
    request(app.getHttpServer())
      .post(RULINGS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send(body);

  const countKeywords = async (): Promise<number> => {
    const [row]: { total: string }[] = await app
      .get(DataSource)
      .query('SELECT COUNT(*) AS total FROM palabras_clave');
    return Number(row.total);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearRulingTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);
    existingId = (await post(BASE).expect(201)).body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('pregunta si coinciden el tribunal y el número, con los datos del fallo existente', async () => {
    const response = await post({
      ...BASE,
      caratula: 'Otra carátula',
      fecha: '2021-01-01',
    }).expect(409);

    expect(response.body).toEqual({
      statusCode: 409,
      message: BY_NUMBER,
      codigo: 'FALLO_REPETIDO',
      fallo: {
        id: existingId,
        caratula: BASE.caratula,
        tribunal: BASE.tribunal,
        fecha: BASE.fecha,
        numero: BASE.numero,
      },
    });
  });

  it('compara tribunal y número sin distinguir mayúsculas, tildes ni espacios repetidos', async () => {
    const response = await post({
      ...BASE,
      caratula: 'Otra carátula',
      fecha: '2021-01-01',
      tribunal: '  CAMARA  civil, sala b ',
    }).expect(409);

    expect(response.body.message).toBe(BY_NUMBER);
  });

  it('pregunta por carátula, tribunal y fecha aunque los números sean distintos', async () => {
    const response = await post({ ...BASE, numero: '9999/2019' }).expect(409);

    expect(response.body.message).toBe(BY_CAPTION);
    expect(response.body.codigo).toBe('FALLO_REPETIDO');
    expect(response.body.fallo.id).toBe(existingId);
  });

  it('pregunta por carátula, tribunal y fecha si el fallo nuevo no tiene número', async () => {
    const response = await post({
      ...BASE,
      numero: null,
      caratula: 'MUNOZ c/ clinica del sur s/ danos',
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(BY_CAPTION);
  });

  it.each([
    ['el mismo número en otro tribunal', { tribunal: 'Cámara Civil, Sala C' }],
    ['el mismo número con otro separador', { numero: '5678-2019' }],
  ])('no pregunta con %s si cambia además la carátula', async (_case, changes) => {
    await post({ ...BASE, caratula: `Sin pregunta: ${_case}`, ...changes }).expect(201);
  });

  it('con la confirmación, guarda el fallo repetido', async () => {
    const response = await post({ ...BASE, confirmarRepetido: true }).expect(201);
    expect(response.body.id).not.toBe(existingId);
  });

  it('con varias coincidencias, devuelve la primera según el orden del listado', async () => {
    // El existente y el confirmado en el test anterior tienen la misma fecha: el orden lo
    // decide el momento de carga, primero el último.
    const response = await post({ ...BASE, numero: '9999/2019' }).expect(409);
    expect(response.body.fallo.id).toBeGreaterThan(existingId);
  });

  it('no pregunta por un repetido de un fallo desactivado', async () => {
    await createTestFallo(app, {
      creadoPorId: lawyer.id,
      caratula: 'Fallo desactivado',
      tribunal: 'Juzgado Federal Nº 1',
      numero: '111/2015',
      fecha: '2015-03-02',
      activo: false,
    });

    await post({
      ...BASE,
      caratula: 'Fallo desactivado',
      tribunal: 'Juzgado Federal Nº 1',
      numero: '111/2015',
      fecha: '2015-03-02',
    }).expect(201);
  });

  it('un 409 de repetido no agrega palabras al catálogo (RF-12)', async () => {
    const before = await countKeywords();

    await post({ ...BASE, palabrasClave: ['palabra que no se guarda'] }).expect(409);

    expect(await countKeywords()).toBe(before);
  });
});
