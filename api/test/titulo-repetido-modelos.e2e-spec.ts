import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearModelTables, createTestModelo } from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MODELS = '/api/panel/modelos-escritos';
const REPEATED = 'Ya existe un modelo con ese título';

const BASE = {
  titulo: 'Cédula de notificación',
  tipo: 'cedula',
  fuero: 'laboral',
  texto: 'Señor/a #DEMANDADOS#:',
};

/** RF-15: aviso de título repetido en la carga. */
describe('aviso de título repetido en la carga de un modelo', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let existingId: number;

  const post = (body: object) =>
    request(app.getHttpServer())
      .post(MODELS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send(body);

  const countModels = async (): Promise<number> => {
    const [row]: { total: string }[] = await app
      .get(DataSource)
      .query('SELECT COUNT(*) AS total FROM modelos_escritos');
    return Number(row.total);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearModelTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);
    existingId = (await post(BASE).expect(201)).body.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('pregunta si el título coincide con el de un modelo activo, y no guarda nada', async () => {
    const before = await countModels();

    const response = await post({ ...BASE, tipo: 'oficio', texto: 'Otro texto.' }).expect(409);

    expect(response.body).toEqual({
      statusCode: 409,
      message: REPEATED,
      codigo: 'MODELO_REPETIDO',
      modelos: [
        { id: existingId, titulo: 'Cédula de notificación', tipo: 'cedula', fuero: 'laboral' },
      ],
    });
    expect(await countModels()).toBe(before);
  });

  it.each([
    ['otras mayúsculas', 'CÉDULA DE NOTIFICACIÓN'],
    ['sin tildes', 'Cedula de notificacion'],
    ['espacios de más', '  Cédula   de  notificación  '],
    ['un salto de línea en el medio', 'Cédula de\nnotificación'],
  ])('también pregunta con %s', async (_case, titulo) => {
    const response = await post({ ...BASE, titulo }).expect(409);

    expect(response.body.codigo).toBe('MODELO_REPETIDO');
    expect(response.body.modelos.map((modelo: { id: number }) => modelo.id)).toEqual([existingId]);
  });

  it('no pregunta por un título parecido pero distinto', async () => {
    for (const titulo of ['Cédula de notificación 2', 'Cédula', 'Cédula-de-notificación']) {
      await post({ ...BASE, titulo }).expect(201);
    }
  });

  it('con la confirmación guarda el modelo, y la pregunta siguiente trae los dos (RF-15)', async () => {
    const confirmed = await post({ ...BASE, fuero: 'civil', confirmarRepetido: true }).expect(201);

    const response = await post({ ...BASE, titulo: 'cedula de notificacion' }).expect(409);

    // Todos los activos con los que coincide, en el orden del listado: a igual título, primero
    // el último registrado.
    expect(response.body.modelos).toEqual([
      { id: confirmed.body.id, titulo: 'Cédula de notificación', tipo: 'cedula', fuero: 'civil' },
      { id: existingId, titulo: 'Cédula de notificación', tipo: 'cedula', fuero: 'laboral' },
    ]);
  });

  it('confirmarRepetido en false pregunta igual', async () => {
    await post({ ...BASE, confirmarRepetido: false }).expect(409);
  });

  it('no pregunta si el título coincide con el de un modelo desactivado', async () => {
    await createTestModelo(app, {
      creadoPorId: lawyer.id,
      titulo: 'Demanda laboral vieja',
      activo: false,
    });

    const response = await post({ ...BASE, titulo: 'Demanda laboral vieja' }).expect(201);

    expect(response.body.activo).toBe(true);
  });

  it('la pregunta no incluye el texto de los modelos ni datos de sus autores', async () => {
    const response = await post(BASE).expect(409);
    const json = JSON.stringify(response.body);

    expect(json).not.toContain('#DEMANDADOS#');
    expect(json).not.toContain('creadoPor');
    expect(json).not.toContain('@estudio.com');
  });

  it('una carga con datos inválidos se rechaza por validación, sin preguntar', async () => {
    const response = await post({ ...BASE, texto: 'Autos #CARATUAL#.' }).expect(400);

    expect(response.body.message).toEqual(['El texto tiene variables que no existen']);
  });
});
