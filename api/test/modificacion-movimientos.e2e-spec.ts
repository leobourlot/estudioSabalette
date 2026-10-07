import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CambioMovimiento } from '../src/movimientos/cambio-movimiento.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const movementsOf = (causaId: number) => `/api/panel/causas/${causaId}/movimientos`;

/** RF-2, RF-11, RF-12, RF-14, RF-15, RF-20: modificación y visibilidad. */
describe('modificación de movimientos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let other: Usuario;
  let session: TestSession;
  let otherSession: TestSession;
  let causaId: number;

  const patch = (movimientoId: number, body: object, as: TestSession = session) =>
    request(app.getHttpServer())
      .patch(`${movementsOf(causaId)}/${movimientoId}`)
      .set('Cookie', `access_token=${as.accessToken}`)
      .send(body);

  const newMovement = (data: { textoCliente?: string | null; anulado?: boolean } = {}) =>
    createTestMovimiento(app, { causaId, creadoPorId: lawyer.id, ...data });

  const changesOf = (movimientoId: number) =>
    app
      .get(DataSource)
      .getRepository(CambioMovimiento)
      .find({
        where: { movimientoId },
        order: { id: 'ASC' },
      });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    other = await createTestUser(app, {
      email: 'otra@estudio.com',
      nombre: 'Marta',
      apellido: 'Díaz',
    });
    session = await loginAs(app, lawyer.email!);
    otherSession = await loginAs(app, other.email!);
    causaId = (await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id })).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ['fecha', { fecha: '2025-07-15' }, '2024-03-01', '2025-07-15'],
    ['tipo', { tipo: 'sentencia' }, 'providencia', 'sentencia'],
    [
      'descripcion',
      { descripcion: 'Nueva descripción.' },
      'Se fija audiencia preliminar.',
      'Nueva descripción.',
    ],
    ['textoCliente', { textoCliente: 'Texto para el cliente.' }, null, 'Texto para el cliente.'],
  ])(
    'modifica %s y registra quién y el cambio (RF-2, RF-11, RF-20)',
    async (campo, body, anterior, nuevo) => {
      const movimiento = await newMovement();

      const response = await patch(movimiento.id, body, otherSession).expect(200);

      expect(response.body).toMatchObject({
        [campo]: nuevo,
        modificadoPor: { id: other.id, nombre: 'Marta', apellido: 'Díaz' },
      });
      expect(response.body.modificadoEn).not.toBeNull();
      expect(response.body.cambios[0]).toMatchObject({
        accion: 'modificacion',
        usuario: { id: other.id },
        cambios: [{ campo, anterior, nuevo }],
      });
      // El cambio y la modificación son el mismo instante.
      expect(new Date(response.body.cambios[0].fechaHora).getTime()).toBe(
        new Date(response.body.modificadoEn).getTime(),
      );
    },
  );

  it('cambia la visibilidad en los dos sentidos, cada vez como una modificación (RF-14)', async () => {
    const movimiento = await newMovement();

    await patch(movimiento.id, { visible: true }).expect(200);
    const hidden = await patch(movimiento.id, { visible: false }).expect(200);

    expect(hidden.body.visible).toBe(false);
    const changes = await changesOf(movimiento.id);
    expect(changes.map((change) => [change.accion, change.cambios])).toEqual([
      ['carga', expect.any(Array)],
      ['modificacion', [{ campo: 'visible', anterior: false, nuevo: true }]],
      ['modificacion', [{ campo: 'visible', anterior: true, nuevo: false }]],
    ]);
  });

  it('modifica varios datos a la vez en un solo cambio', async () => {
    const movimiento = await newMovement();

    const response = await patch(movimiento.id, {
      tipo: 'oficio',
      visible: true,
      textoCliente: 'Se libró un oficio.',
    }).expect(200);

    expect(response.body.cambios[0].cambios).toEqual([
      { campo: 'tipo', anterior: 'providencia', nuevo: 'oficio' },
      { campo: 'textoCliente', anterior: null, nuevo: 'Se libró un oficio.' },
      { campo: 'visible', anterior: false, nuevo: true },
    ]);
  });

  it.each([
    ['null', null],
    ['vacío', '   '],
  ])('borrar el texto para el cliente con %s lo deja en NULL', async (_case, textoCliente) => {
    const movimiento = await newMovement({ textoCliente: 'Texto anterior.' });

    const response = await patch(movimiento.id, { textoCliente }).expect(200);

    expect(response.body).toMatchObject({
      textoCliente: null,
      textoVisible: 'Se fija audiencia preliminar.',
      origenTextoVisible: 'descripcion',
    });
  });

  it('un PATCH sin cambios no registra nada', async () => {
    const movimiento = await newMovement();

    const response = await patch(movimiento.id, {
      fecha: '2024-03-01',
      tipo: 'providencia',
      visible: false,
    }).expect(200);

    expect(response.body.modificadoPor).toBeNull();
    expect(response.body.modificadoEn).toBeNull();
    expect(await changesOf(movimiento.id)).toHaveLength(1);
  });

  it('rechaza pasar el movimiento a otra causa (RF-12)', async () => {
    const movimiento = await newMovement();

    const response = await patch(movimiento.id, { causaId: causaId + 1 }).expect(400);

    expect(response.body.message).toEqual(['El campo causaId no está permitido']);
  });

  it.each([
    ['sus datos', { descripcion: 'Otra.' }],
    ['solo su visibilidad', { visible: true }],
  ])('rechaza modificar %s de un movimiento anulado (RF-15)', async (_case, body) => {
    const movimiento = await newMovement({ anulado: true });

    const response = await patch(movimiento.id, body).expect(409);

    expect(response.body.message).toBe('El movimiento está anulado. Restauralo para modificarlo');
    expect(await changesOf(movimiento.id)).toHaveLength(1);
  });

  it('responde 404 con un movimiento de otra causa (RF-34)', async () => {
    const otherCausa = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
    });
    const foreign = await createTestMovimiento(app, {
      causaId: otherCausa.id,
      creadoPorId: lawyer.id,
    });

    const response = await patch(foreign.id, { visible: true }).expect(404);

    expect(response.body.message).toBe('No existe ese movimiento');
  });
});
