import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Fallo } from '../src/jurisprudencia/fallo.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { clearRulingTables, createTestFallo } from './utilidades/fallos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const RULINGS = '/api/panel/jurisprudencia';

/** RF-2, RF-29 a RF-32: desactivación y reactivación de un fallo. */
describe('desactivación y reactivación de un fallo', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let admin: Usuario;
  let adminSession: TestSession;
  let falloId: number;

  const withSession = (test: request.Test) =>
    test.set('Cookie', `access_token=${adminSession.accessToken}`);
  const server = () => request(app.getHttpServer());
  const deactivate = (id: number | string) =>
    withSession(server().post(`${RULINGS}/${id}/desactivar`));
  const reactivate = (id: number | string, body: object = {}) =>
    withSession(server().post(`${RULINGS}/${id}/reactivar`)).send(body);
  const patch = (id: number, body: object) =>
    withSession(server().patch(`${RULINGS}/${id}`)).send(body);
  const get = (id: number) => withSession(server().get(`${RULINGS}/${id}`));

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
    await clearRulingTables(app);
    falloId = (
      await createTestFallo(app, {
        creadoPorId: lawyer.id,
        numero: '1234/2018',
        palabrasClave: ['daño moral'],
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('desactiva un fallo, registra quién lo hizo y conserva sus datos (RF-2, RF-29)', async () => {
    const before = Date.now();
    const response = await deactivate(falloId).expect(200);

    expect(response.body).toMatchObject({
      id: falloId,
      activo: false,
      caratula: 'Pérez c/ López s/ daños',
      numero: '1234/2018',
      creadoPor: { id: lawyer.id },
      modificadoPor: { id: admin.id, nombre: 'Ana', apellido: 'Sabalette' },
    });
    expect(response.body.palabrasClave.map((p: { texto: string }) => p.texto)).toEqual([
      'daño moral',
    ]);
    expect(new Date(response.body.modificadoEn).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('nunca borra el fallo: sigue en la base y se puede consultar (RF-29, RF-30)', async () => {
    await deactivate(falloId).expect(200);

    expect(await app.get(DataSource).getRepository(Fallo).countBy({ id: falloId })).toBe(1);
    expect((await get(falloId).expect(200)).body.activo).toBe(false);
  });

  it('un fallo desactivado no se puede modificar hasta reactivarlo (RF-30)', async () => {
    await deactivate(falloId).expect(200);

    const response = await patch(falloId, { sumario: 'Cambio.' }).expect(409);
    expect(response.body.message).toBe('El fallo está desactivado. Reactivalo para modificarlo');

    await reactivate(falloId).expect(200);
    await patch(falloId, { sumario: 'Cambio.' }).expect(200);
  });

  it('reactiva un fallo y registra quién lo hizo (RF-2, RF-31)', async () => {
    await deactivate(falloId).expect(200);

    const response = await reactivate(falloId).expect(200);

    expect(response.body).toMatchObject({
      id: falloId,
      activo: true,
      modificadoPor: { id: admin.id },
    });
  });

  it('rechaza desactivar un fallo ya desactivado y reactivar uno activo (RF-32)', async () => {
    expect((await reactivate(falloId).expect(409)).body.message).toBe('El fallo ya está activo');

    await deactivate(falloId).expect(200);

    expect((await deactivate(falloId).expect(409)).body.message).toBe(
      'El fallo ya está desactivado',
    );
  });

  describe('reactivación de un fallo repetido (RF-18, RF-31)', () => {
    let otherId: number;

    beforeEach(async () => {
      await deactivate(falloId).expect(200);
      // Mientras el primero está desactivado, se carga otro con el mismo tribunal y número.
      otherId = (
        await createTestFallo(app, {
          creadoPorId: lawyer.id,
          caratula: 'Otra carátula',
          numero: '1234/2018',
          fecha: '2020-01-01',
        })
      ).id;
    });

    it('pregunta antes de reactivar, y el fallo sigue desactivado', async () => {
      const response = await reactivate(falloId).expect(409);

      expect(response.body).toMatchObject({
        codigo: 'FALLO_REPETIDO',
        message: 'Ya existe un fallo con ese número en ese tribunal',
        fallo: { id: otherId, caratula: 'Otra carátula' },
      });
      expect((await get(falloId).expect(200)).body.activo).toBe(false);
    });

    it('con la confirmación, lo reactiva', async () => {
      const response = await reactivate(falloId, { confirmarRepetido: true }).expect(200);
      expect(response.body.activo).toBe(true);
    });

    it('rechaza una confirmación que no es booleana', async () => {
      await reactivate(falloId, { confirmarRepetido: 'si' }).expect(400);
    });
  });

  it.each([
    ['inexistente', '999999'],
    ['no numérico', 'abc'],
  ])('responde 404 con un id %s (RF-33)', async (_case, id) => {
    expect((await deactivate(id).expect(404)).body.message).toBe('No existe ese fallo');
    expect((await reactivate(id).expect(404)).body.message).toBe('No existe ese fallo');
  });

  it('una desactivación y una modificación simultáneas se ejecutan de a una (RF-30)', async () => {
    for (let round = 0; round < 5; round++) {
      const fallo = await createTestFallo(app, {
        creadoPorId: lawyer.id,
        caratula: `Fallo simultáneo ${round}`,
        sumario: 'Sumario original.',
      });

      const [deactivation, update] = await Promise.all([
        deactivate(fallo.id),
        patch(fallo.id, { sumario: 'Sumario modificado.' }),
      ]);

      expect(deactivation.status).toBe(200);
      expect([200, 409]).toContain(update.status);
      const stored = await app
        .get(DataSource)
        .getRepository(Fallo)
        .findOneByOrFail({ id: fallo.id });
      expect(stored.activo).toBe(false);
      if (update.status === 409) {
        // La desactivación quedó primero: la modificación vio el fallo desactivado.
        expect(update.body.message).toBe('El fallo está desactivado. Reactivalo para modificarlo');
        expect(stored.sumario).toBe('Sumario original.');
      } else {
        // La modificación quedó primero y la desactivación después.
        expect(stored.sumario).toBe('Sumario modificado.');
      }
    }
  });
});
