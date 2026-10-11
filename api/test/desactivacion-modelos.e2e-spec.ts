import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ModeloEscrito } from '../src/modelos-escritos/modelo-escrito.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearModelTables, createTestModelo } from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const MODELS = '/api/panel/modelos-escritos';

/** RF-2, RF-25 a RF-28: desactivación y reactivación de un modelo. */
describe('desactivación y reactivación de un modelo de escrito', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let admin: Usuario;
  let adminSession: TestSession;
  let modeloId: number;

  const withSession = (test: request.Test) =>
    test.set('Cookie', `access_token=${adminSession.accessToken}`);
  const server = () => request(app.getHttpServer());
  const deactivate = (id: number | string) =>
    withSession(server().post(`${MODELS}/${id}/desactivar`));
  const reactivate = (id: number | string, body: object = {}) =>
    withSession(server().post(`${MODELS}/${id}/reactivar`)).send(body);
  const patch = (id: number, body: object) =>
    withSession(server().patch(`${MODELS}/${id}`)).send(body);
  const get = (id: number) => withSession(server().get(`${MODELS}/${id}`));

  const stored = (id: number) =>
    app.get(DataSource).getRepository(ModeloEscrito).findOneByOrFail({ id });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    admin = await createTestUser(app, {
      rol: 'admin',
      email: 'admin@estudio.com',
      nombre: 'Ana',
      apellido: 'Sabalette',
    });
    adminSession = await loginAs(app, admin.email!);
  });

  beforeEach(async () => {
    await clearModelTables(app);
    modeloId = (
      await createTestModelo(app, {
        creadoPorId: lawyer.id,
        titulo: 'Oficio al Registro',
        descripcion: 'Para pedir informes',
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('desactiva un modelo, registra quién lo hizo y conserva sus datos (RF-2, RF-25)', async () => {
    const before = Date.now();

    const response = await deactivate(modeloId).expect(200);

    expect(response.body).toMatchObject({
      id: modeloId,
      titulo: 'Oficio al Registro',
      descripcion: 'Para pedir informes',
      activo: false,
      creadoPor: { id: lawyer.id },
      modificadoPor: { id: admin.id, nombre: 'Ana', apellido: 'Sabalette' },
    });
    expect(new Date(response.body.modificadoEn).getTime()).toBeGreaterThanOrEqual(before - 5_000);
  });

  it('nunca borra el modelo: sigue en la base y se puede consultar (RF-25, RF-26)', async () => {
    await deactivate(modeloId).expect(200);

    expect((await stored(modeloId)).activo).toBe(false);
    expect((await get(modeloId).expect(200)).body.activo).toBe(false);
  });

  it('un modelo desactivado no se puede modificar hasta reactivarlo (RF-26)', async () => {
    await deactivate(modeloId).expect(200);

    const rejected = await patch(modeloId, { descripcion: 'Cambio' }).expect(409);
    expect(rejected.body.message).toBe('El modelo está desactivado. Reactivalo para modificarlo');

    await reactivate(modeloId).expect(200);
    await patch(modeloId, { descripcion: 'Cambio' }).expect(200);
  });

  it('reactiva un modelo y registra quién lo hizo (RF-2, RF-27)', async () => {
    const deactivated = await createTestModelo(app, {
      creadoPorId: lawyer.id,
      titulo: 'Modelo a reactivar',
      activo: false,
    });

    const response = await reactivate(deactivated.id).expect(200);

    expect(response.body).toMatchObject({
      id: deactivated.id,
      activo: true,
      modificadoPor: { id: admin.id },
    });
    expect(response.body.modificadoEn).toEqual(expect.any(String));
  });

  it('rechaza desactivar un modelo ya desactivado y reactivar uno activo (RF-28)', async () => {
    const active = await reactivate(modeloId).expect(409);
    expect(active.body.message).toBe('El modelo ya está activo');

    await deactivate(modeloId).expect(200);
    const again = await deactivate(modeloId).expect(409);
    expect(again.body.message).toBe('El modelo ya está desactivado');
  });

  describe('reactivar un modelo cuyo título coincide con el de otro activo (RF-15, RF-27)', () => {
    let repeatedId: number;

    beforeEach(async () => {
      repeatedId = (
        await createTestModelo(app, {
          creadoPorId: lawyer.id,
          titulo: 'OFICIO AL REGISTRO',
          tipo: 'oficio',
          fuero: 'civil',
          activo: false,
        })
      ).id;
    });

    it('pregunta antes de reactivar, y el modelo sigue desactivado', async () => {
      const response = await reactivate(repeatedId).expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        message: 'Ya existe un modelo con ese título',
        codigo: 'MODELO_REPETIDO',
        modelos: [{ id: modeloId, titulo: 'Oficio al Registro', tipo: 'oficio', fuero: 'otro' }],
      });
      expect((await stored(repeatedId)).activo).toBe(false);
    });

    it('con la confirmación, lo reactiva', async () => {
      const response = await reactivate(repeatedId, { confirmarRepetido: true }).expect(200);

      expect(response.body.activo).toBe(true);
    });

    it('rechaza una confirmación que no es booleana', async () => {
      const response = await reactivate(repeatedId, { confirmarRepetido: 'si' }).expect(400);

      expect(response.body.message).toEqual(['La confirmación debe ser true o false']);
    });

    it('si el otro modelo también está desactivado, no pregunta', async () => {
      await deactivate(modeloId).expect(200);

      await reactivate(repeatedId).expect(200);
    });
  });

  it.each([
    ['un id inexistente', '999999'],
    ['un id que no es un número', 'abc'],
  ])('responde 404 "No existe ese modelo" con %s (RF-49)', async (_case, id) => {
    expect((await deactivate(id).expect(404)).body.message).toBe('No existe ese modelo');
    expect((await reactivate(id).expect(404)).body.message).toBe('No existe ese modelo');
  });

  it('una desactivación y una modificación simultáneas se ejecutan de a una (RF-26)', async () => {
    for (let round = 0; round < 5; round++) {
      const modelo = await createTestModelo(app, {
        creadoPorId: lawyer.id,
        titulo: `Modelo simultáneo ${round}`,
        descripcion: 'Descripción original',
      });

      const [deactivation, update] = await Promise.all([
        deactivate(modelo.id),
        patch(modelo.id, { descripcion: 'Descripción modificada' }),
      ]);

      expect(deactivation.status).toBe(200);
      expect([200, 409]).toContain(update.status);
      const row = await stored(modelo.id);
      expect(row.activo).toBe(false);
      if (update.status === 409) {
        // La desactivación quedó primero: la modificación vio el modelo desactivado.
        expect(update.body.message).toBe('El modelo está desactivado. Reactivalo para modificarlo');
        expect(row.descripcion).toBe('Descripción original');
      } else {
        // La modificación quedó primero y la desactivación después.
        expect(row.descripcion).toBe('Descripción modificada');
      }
    }
  });
});
