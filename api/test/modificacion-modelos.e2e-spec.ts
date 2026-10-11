import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearModelTables, createTestModelo } from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MODELS = '/api/panel/modelos-escritos';

const ORIGINAL = {
  titulo: 'Oficio al Registro de la Propiedad',
  tipo: 'oficio',
  fuero: 'civil',
  descripcion: 'Para pedir un informe de dominio',
  texto: 'Señor Director:\n\nEn los autos "#CARATULA#".',
} as const;

/** RF-2, RF-14, RF-15, RF-26: modificación de un modelo. */
describe('modificación de un modelo de escrito', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let admin: Usuario;
  let adminSession: TestSession;
  let modeloId: number;

  const patch = (id: number | string, body: object) =>
    request(app.getHttpServer())
      .patch(`${MODELS}/${id}`)
      .set('Cookie', `access_token=${adminSession.accessToken}`)
      .send(body);

  const get = (id: number) =>
    request(app.getHttpServer())
      .get(`${MODELS}/${id}`)
      .set('Cookie', `access_token=${adminSession.accessToken}`);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
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
    adminSession = await loginAs(app, admin.email!);
  });

  // Cada test parte de un modelo recién cargado por el abogado, sin modificar.
  beforeEach(async () => {
    await clearModelTables(app);
    modeloId = (await createTestModelo(app, { creadoPorId: lawyer.id, ...ORIGINAL })).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ['el título', { titulo: 'Oficio al Banco Nación' }],
    ['el tipo', { tipo: 'cedula' }],
    ['el fuero', { fuero: 'otro' }],
    ['la descripción', { descripcion: 'Para pedir saldos' }],
    ['el texto', { texto: 'Señor Gerente:\n\n#ACTORES# solicita informes.' }],
  ])('modifica %s y registra quién lo hizo y cuándo (RF-2, RF-14)', async (_case, changes) => {
    const before = Date.now();

    const response = await patch(modeloId, changes).expect(200);

    expect(response.body).toMatchObject({
      ...ORIGINAL,
      ...changes,
      id: modeloId,
      creadoPor: { id: lawyer.id },
      modificadoPor: { id: admin.id, nombre: 'Ana', apellido: 'Sabalette', activo: true },
    });
    const modificadoEn = new Date(response.body.modificadoEn).getTime();
    expect(modificadoEn).toBeGreaterThanOrEqual(before - 5_000);
    expect((await get(modeloId).expect(200)).body).toEqual(response.body);
  });

  it('modifica varios datos a la vez y actualiza las variables que usa el texto', async () => {
    const response = await patch(modeloId, {
      titulo: 'Cédula laboral',
      tipo: 'cedula',
      fuero: 'laboral',
      texto: 'Señor/a #demandados#, del #fecha_en_letras#.',
    }).expect(200);

    expect(response.body).toMatchObject({
      titulo: 'Cédula laboral',
      tipo: 'cedula',
      fuero: 'laboral',
      texto: 'Señor/a #DEMANDADOS#, del #FECHA_EN_LETRAS#.',
      variables: ['DEMANDADOS', 'FECHA_EN_LETRAS'],
      descripcion: ORIGINAL.descripcion,
    });
  });

  it.each([null, '', '   '])('la descripción %j queda como no informada (RF-14)', async (value) => {
    const response = await patch(modeloId, { descripcion: value }).expect(200);

    expect(response.body.descripcion).toBeNull();
    expect(response.body.modificadoPor).toMatchObject({ id: admin.id });
  });

  it.each([
    ['un cuerpo vacío', {}],
    ['los mismos datos', { ...ORIGINAL }],
    [
      'el mismo texto con la variable escrita de otra forma',
      { texto: 'Señor Director:\n\nEn los autos "#carátula#".' },
    ],
    ['el mismo título con espacios de más', { titulo: `  ${ORIGINAL.titulo}  ` }],
  ])('con %s no cuenta como modificación (RF-14)', async (_case, body) => {
    const response = await patch(modeloId, body).expect(200);

    expect(response.body).toMatchObject({ ...ORIGINAL, modificadoPor: null, modificadoEn: null });
  });

  describe('título repetido (RF-15)', () => {
    let otherId: number;

    beforeEach(async () => {
      otherId = (
        await createTestModelo(app, {
          creadoPorId: lawyer.id,
          titulo: 'Cédula de notificación',
          tipo: 'cedula',
          fuero: 'laboral',
        })
      ).id;
    });

    it('pregunta si el título nuevo coincide con el de otro modelo activo, y no guarda nada', async () => {
      const response = await patch(modeloId, {
        titulo: 'CEDULA DE NOTIFICACION',
        descripcion: 'Cambio que no se guarda',
      }).expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        message: 'Ya existe un modelo con ese título',
        codigo: 'MODELO_REPETIDO',
        modelos: [
          { id: otherId, titulo: 'Cédula de notificación', tipo: 'cedula', fuero: 'laboral' },
        ],
      });
      expect((await get(modeloId).expect(200)).body).toMatchObject({
        ...ORIGINAL,
        modificadoPor: null,
      });
    });

    it('con la confirmación, guarda el título repetido', async () => {
      const response = await patch(modeloId, {
        titulo: 'Cédula de notificación',
        confirmarRepetido: true,
      }).expect(200);

      expect(response.body.titulo).toBe('Cédula de notificación');
    });

    it('no pregunta si el título no cambia, aunque ya coincida con el de otro modelo', async () => {
      await patch(modeloId, { titulo: 'Cédula de notificación', confirmarRepetido: true }).expect(
        200,
      );

      const response = await patch(modeloId, { descripcion: 'Otra descripción' }).expect(200);

      expect(response.body.descripcion).toBe('Otra descripción');
    });

    it('el modelo no se compara consigo mismo al cambiar la forma de su título', async () => {
      const response = await patch(modeloId, {
        titulo: 'OFICIO AL REGISTRO DE LA PROPIEDAD',
      }).expect(200);

      expect(response.body.titulo).toBe('OFICIO AL REGISTRO DE LA PROPIEDAD');
    });

    it('no pregunta si el título coincide con el de un modelo desactivado', async () => {
      await createTestModelo(app, {
        creadoPorId: lawyer.id,
        titulo: 'Demanda vieja',
        activo: false,
      });

      await patch(modeloId, { titulo: 'Demanda vieja' }).expect(200);
    });
  });

  it('un modelo desactivado no se puede modificar (RF-26)', async () => {
    const deactivated = await createTestModelo(app, {
      creadoPorId: lawyer.id,
      titulo: 'Modelo desactivado',
      activo: false,
    });

    const response = await patch(deactivated.id, { descripcion: 'Cambio' }).expect(409);

    expect(response.body.message).toBe('El modelo está desactivado. Reactivalo para modificarlo');
    expect((await get(deactivated.id).expect(200)).body).toMatchObject({
      descripcion: null,
      modificadoPor: null,
    });
  });

  it.each([
    ['activo', { activo: false }],
    ['un campo desconocido', { creadoPorId: 1 }],
  ])('rechaza %s: solo cambia con desactivar y reactivar (RF-14)', async (_case, body) => {
    const response = await patch(modeloId, body).expect(400);

    expect(response.body.message).toHaveLength(1);
    expect(response.body.message[0]).toMatch(/no está permitido/);
  });

  it.each([
    ['un título vacío', { titulo: '  ' }, 'Indicá el título del modelo'],
    ['un texto vacío', { texto: ' \n ' }, 'Indicá el texto del modelo'],
    [
      'una variable que no existe',
      { texto: 'Autos #CARATUAL#.' },
      'El texto tiene variables que no existen',
    ],
    [
      'variables pegadas',
      { texto: '#ACTORES##DEMANDADOS#' },
      'Las variables tienen que estar separadas',
    ],
    [
      'un @ en el título',
      { titulo: 'Oficio a estudio@ejemplo.com' },
      /^El título solo puede tener/,
    ],
  ])('rechaza %s con las reglas de la carga', async (_case, body, message) => {
    const response = await patch(modeloId, body).expect(400);

    expect(response.body.message).toHaveLength(1);
    expect(response.body.message[0]).toMatch(message);
    expect((await get(modeloId).expect(200)).body).toMatchObject({ ...ORIGINAL });
  });

  it.each([
    ['un id inexistente', '999999'],
    ['un id que no es un número', 'abc'],
  ])('responde 404 "No existe ese modelo" con %s (RF-49)', async (_case, id) => {
    const response = await patch(id, { descripcion: 'Cambio' }).expect(404);

    expect(response.body.message).toBe('No existe ese modelo');
  });
});
