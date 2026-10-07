import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CambioMovimiento } from '../src/movimientos/cambio-movimiento.entity.js';
import { Movimiento } from '../src/movimientos/movimiento.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const movementsOf = (causaId: number | string) => `/api/panel/causas/${causaId}/movimientos`;

const MINIMAL = {
  fecha: '2024-03-01',
  tipo: 'providencia',
  descripcion: 'Se fija audiencia preliminar para el 12/11.',
};

/** RF-1, RF-2, RF-8, RF-20, RF-34: carga de movimientos. */
describe('carga de movimientos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let causaId: number;

  const post = (path: string) =>
    request(app.getHttpServer()).post(path).set('Cookie', `access_token=${session.accessToken}`);

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
    causaId = causa.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('carga un movimiento no visible por defecto, con su autor (RF-2, RF-8)', async () => {
    const response = await post(movementsOf(causaId)).send(MINIMAL).expect(201);

    expect(response.body).toMatchObject({
      causaId,
      causaActiva: true,
      fecha: '2024-03-01',
      tipo: 'providencia',
      descripcion: MINIMAL.descripcion,
      textoCliente: null,
      textoVisible: MINIMAL.descripcion,
      origenTextoVisible: 'descripcion',
      visible: false,
      tieneTextoCliente: false,
      anulado: false,
      esFechaFutura: false,
      creadoPor: { id: lawyer.id, nombre: 'Luis', apellido: 'Sosa', activo: true },
      modificadoPor: null,
      modificadoEn: null,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/email|contrasena/);

    const saved = await app.get(DataSource).getRepository(Movimiento).findOneByOrFail({
      id: response.body.id,
    });
    expect(saved).toMatchObject({
      causaId,
      visible: false,
      anulado: false,
      creadoPorId: lawyer.id,
    });
  });

  it('carga un movimiento visible con texto para el cliente', async () => {
    const response = await post(movementsOf(causaId))
      .send({ ...MINIMAL, textoCliente: '  El juez fijó una audiencia.  ', visible: true })
      .expect(201);

    expect(response.body).toMatchObject({
      visible: true,
      textoCliente: 'El juez fijó una audiencia.',
      textoVisible: 'El juez fijó una audiencia.',
      origenTextoVisible: 'textoCliente',
      tieneTextoCliente: true,
    });
  });

  it('registra el cambio de carga con todos los valores iniciales (RF-20)', async () => {
    const response = await post(movementsOf(causaId))
      .send({ ...MINIMAL, fecha: '2099-12-31', tipo: 'audiencia', visible: true })
      .expect(201);

    expect(response.body.esFechaFutura).toBe(true);
    expect(response.body.cambios).toHaveLength(1);
    expect(response.body.cambios[0]).toMatchObject({
      accion: 'carga',
      usuario: { id: lawyer.id, activo: true },
      cambios: [
        { campo: 'fecha', anterior: null, nuevo: '2099-12-31' },
        { campo: 'tipo', anterior: null, nuevo: 'audiencia' },
        { campo: 'descripcion', anterior: null, nuevo: MINIMAL.descripcion },
        { campo: 'textoCliente', anterior: null, nuevo: null },
        { campo: 'visible', anterior: null, nuevo: true },
        { campo: 'anulado', anterior: null, nuevo: false },
      ],
    });

    const changes = await app
      .get(DataSource)
      .getRepository(CambioMovimiento)
      .findBy({ movimientoId: response.body.id });
    expect(changes).toHaveLength(1);
    // El cambio de carga y la carga son el mismo instante.
    expect(new Date(response.body.cambios[0].fechaHora).getTime()).toBe(
      new Date(response.body.creadoEn).getTime(),
    );
  });

  it('guarda los saltos de línea intermedios y la fecha como el mismo día (RF-3, RNF de fechas)', async () => {
    const response = await post(movementsOf(causaId))
      .send({ ...MINIMAL, fecha: '1998-05-10', descripcion: 'Primer párrafo.\r\n\r\nSegundo.' })
      .expect(201);

    expect(response.body.fecha).toBe('1998-05-10');
    expect(response.body.descripcion).toBe('Primer párrafo.\n\nSegundo.');
  });

  it.each([
    ['inexistente', 999999],
    ['con id no numérico', 'abc'],
  ])('responde 404 en una causa %s (RF-34)', async (_case, id) => {
    const response = await post(movementsOf(id)).send(MINIMAL).expect(404);
    expect(response.body.message).toBe('No existe esa causa');
  });

  it('un 400 no repite el texto recibido (RNF de registros)', async () => {
    const mark = 'MARCASECRETA';
    const response = await post(movementsOf(causaId))
      .send({ ...MINIMAL, descripcion: `${mark} <script>`, textoCliente: `${mark} 😀` })
      .expect(400);

    expect(response.body.message).toHaveLength(2);
    expect(JSON.stringify(response.body)).not.toContain(mark);
  });

  it('rechaza el campo anulado y el campo causaId', async () => {
    const response = await post(movementsOf(causaId))
      .send({ ...MINIMAL, anulado: true, causaId: 1 })
      .expect(400);

    expect(response.body.message).toEqual([
      'El campo anulado no está permitido',
      'El campo causaId no está permitido',
    ]);
  });
});
