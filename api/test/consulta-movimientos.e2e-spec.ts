import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const movementsOf = (causaId: number | string) => `/api/panel/causas/${causaId}/movimientos`;

/** RF-22, RF-28, RF-34: consulta de un movimiento. */
describe('consulta de un movimiento', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let causaId: number;
  let otherCausaId: number;
  let movimientoId: number;
  let otherMovimientoId: number;

  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set('Cookie', `access_token=${session.accessToken}`);

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, {
      email: 'abogado@estudio.com',
      nombre: 'Luis',
      apellido: 'Sosa',
    });
    session = await loginAs(app, lawyer.email!);
    const causa = await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id });
    const other = await createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      activa: false,
    });
    causaId = causa.id;
    otherCausaId = other.id;

    const response = await request(app.getHttpServer())
      .post(movementsOf(causaId))
      .set('Cookie', `access_token=${session.accessToken}`)
      .send({
        fecha: '2024-03-01',
        tipo: 'resolucion',
        descripcion: 'Se hace lugar a la medida cautelar.',
        textoCliente: 'El juez aceptó la medida que pedimos.',
        visible: true,
      })
      .expect(201);
    movimientoId = response.body.id;
    otherMovimientoId = (
      await createTestMovimiento(app, { causaId: otherCausaId, creadoPorId: lawyer.id })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('devuelve el detalle completo con el texto visible, la auditoría y los cambios (RF-22)', async () => {
    const response = await get(`${movementsOf(causaId)}/${movimientoId}`).expect(200);

    expect(response.body).toMatchObject({
      id: movimientoId,
      causaId,
      causaActiva: true,
      fecha: '2024-03-01',
      tipo: 'resolucion',
      descripcion: 'Se hace lugar a la medida cautelar.',
      textoCliente: 'El juez aceptó la medida que pedimos.',
      textoVisible: 'El juez aceptó la medida que pedimos.',
      origenTextoVisible: 'textoCliente',
      visible: true,
      anulado: false,
      creadoPor: { id: lawyer.id, nombre: 'Luis', apellido: 'Sosa', activo: true },
      modificadoPor: null,
    });
    expect(response.body.cambios).toEqual([
      expect.objectContaining({
        accion: 'carga',
        usuario: expect.objectContaining({ id: lawyer.id }),
      }),
    ]);
    expect(JSON.stringify(response.body)).not.toMatch(/email|contrasena/);
  });

  it('consulta un movimiento de una causa desactivada (RF-28)', async () => {
    const response = await get(`${movementsOf(otherCausaId)}/${otherMovimientoId}`).expect(200);
    expect(response.body.causaActiva).toBe(false);
  });

  it.each([
    ['inexistente', () => `${movementsOf(causaId)}/999999`],
    ['de otra causa', () => `${movementsOf(causaId)}/${otherMovimientoId}`],
    ['con id no numérico', () => `${movementsOf(causaId)}/abc`],
  ])('responde el mismo 404 para un movimiento %s (RF-34)', async (_case, path) => {
    const response = await get(path()).expect(404);
    expect(response.body.message).toBe('No existe ese movimiento');
  });

  it.each([
    ['inexistente', 999999],
    ['con id no numérico', 'abc'],
  ])('responde 404 para una causa %s', async (_case, id) => {
    const response = await get(`${movementsOf(id)}/${movimientoId}`).expect(404);
    expect(response.body.message).toBe('No existe esa causa');
  });
});
