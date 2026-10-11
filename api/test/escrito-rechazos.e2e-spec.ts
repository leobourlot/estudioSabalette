import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Causa, type EstadoCausa } from '../src/causas/causa.entity.js';
import { ModeloEscrito } from '../src/modelos-escritos/modelo-escrito.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearModelTables, createTestModelo } from './utilidades/modelos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

/** RF-2, RF-26, RF-41 a RF-43, RF-46, RF-49: cuándo no se completa un modelo, y que completar solo lee. */
describe('escrito completado: rechazos y solo lectura', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let causaId: number;
  let modeloId: number;

  const complete = (causa: number | string, modelo: number | string) =>
    request(app.getHttpServer())
      .get(`/api/panel/causas/${causa}/escritos/${modelo}`)
      .set('Cookie', `access_token=${session.accessToken}`);

  const newCausa = (data: Partial<Causa> = {}) =>
    createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id, ...data });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearModelTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    session = await loginAs(app, lawyer.email!);
    causaId = (await newCausa({ numeroExpediente: '1234/2026' })).id;
    modeloId = (
      await createTestModelo(app, {
        creadoPorId: lawyer.id,
        texto: 'Autos "#CARATULA#", Expte. Nº #NUMERO_EXPEDIENTE#, de #ACTORES#.',
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('en una causa desactivada responde 409 "La causa está desactivada" (RF-41)', async () => {
    const deactivated = await newCausa({ activa: false });

    const response = await complete(deactivated.id, modeloId).expect(409);

    expect(response.body).toMatchObject({ statusCode: 409, message: 'La causa está desactivada' });
  });

  it('al reactivar la causa, vuelve a completarse (RF-41)', async () => {
    const causa = await newCausa({ activa: false });
    await complete(causa.id, modeloId).expect(409);

    await app.get(DataSource).getRepository(Causa).update(causa.id, { activa: true });

    await complete(causa.id, modeloId).expect(200);
  });

  it.each<EstadoCausa>(['en_tramite', 'paralizada', 'archivada', 'finalizada'])(
    'en una causa activa con el estado %s se completa igual (RF-42)',
    async (estado) => {
      const causa = await newCausa({ estado });

      const response = await complete(causa.id, modeloId).expect(200);

      expect(response.body.causa.id).toBe(causa.id);
    },
  );

  it('con un modelo desactivado responde 409 "El modelo está desactivado" (RF-26)', async () => {
    const deactivated = await createTestModelo(app, {
      creadoPorId: lawyer.id,
      titulo: 'Modelo desactivado',
      activo: false,
    });

    const response = await complete(causaId, deactivated.id).expect(409);

    expect(response.body).toMatchObject({ statusCode: 409, message: 'El modelo está desactivado' });
  });

  it.each([
    ['una causa inexistente', '999999'],
    ['un id de causa que no es un número', 'abc'],
    ['un id de causa con decimales', '1.5'],
  ])('responde 404 "No existe esa causa" con %s (RF-49)', async (_case, causa) => {
    const response = await complete(causa, modeloId).expect(404);

    expect(response.body.message).toBe('No existe esa causa');
  });

  it.each([
    ['un modelo inexistente', '999999'],
    ['un id de modelo que no es un número', 'abc'],
  ])('responde 404 "No existe ese modelo" con %s (RF-49)', async (_case, modelo) => {
    const response = await complete(causaId, modelo).expect(404);

    expect(response.body.message).toBe('No existe ese modelo');
  });

  it('primero se verifica la causa y después el modelo', async () => {
    const deactivatedCausa = await newCausa({ activa: false });
    const deactivatedModel = await createTestModelo(app, {
      creadoPorId: lawyer.id,
      titulo: 'Otro modelo desactivado',
      activo: false,
    });

    expect((await complete('999999', '999999').expect(404)).body.message).toBe(
      'No existe esa causa',
    );
    expect(
      (await complete(deactivatedCausa.id, deactivatedModel.id).expect(409)).body.message,
    ).toBe('La causa está desactivada');
    expect((await complete(deactivatedCausa.id, '999999').expect(409)).body.message).toBe(
      'La causa está desactivada',
    );
  });

  it('un modelo solo se completa dentro de una causa: no hay otra ruta (RF-30)', async () => {
    const server = request(app.getHttpServer());
    const cookie = `access_token=${session.accessToken}`;

    await server
      .get(`/api/panel/modelos-escritos/${modeloId}/escrito`)
      .set('Cookie', cookie)
      .expect(404);
    await server
      .post(`/api/panel/modelos-escritos/${modeloId}/completar`)
      .set('Cookie', cookie)
      .send({ causaId })
      .expect(404);
    await server
      .post(`/api/panel/causas/${causaId}/escritos/${modeloId}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  describe('completar solo lee (RF-2, RF-43, RF-46)', () => {
    const tableNames = async (): Promise<string[]> => {
      const tables: { name: string }[] = await app
        .get(DataSource)
        .query(
          `SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`,
        );
      return tables.map((table) => table.name).sort();
    };

    /** Cantidad de filas de cada tabla de la base de tests. */
    const rowCounts = async (): Promise<Record<string, number>> => {
      const counts: Record<string, number> = {};
      for (const table of await tableNames()) {
        const [row]: { total: string }[] = await app
          .get(DataSource)
          .query(`SELECT COUNT(*) AS total FROM \`${table}\``);
        counts[table] = Number(row.total);
      }
      return counts;
    };

    it('no modifica la causa ni el modelo, ni agrega filas en ninguna tabla', async () => {
      const dataSource = app.get(DataSource);
      const causaBefore = await dataSource.getRepository(Causa).findOneByOrFail({ id: causaId });
      const modeloBefore = await dataSource
        .getRepository(ModeloEscrito)
        .findOneByOrFail({ id: modeloId });
      const countsBefore = await rowCounts();

      for (let round = 0; round < 3; round++) await complete(causaId, modeloId).expect(200);

      expect(await dataSource.getRepository(Causa).findOneByOrFail({ id: causaId })).toEqual(
        causaBefore,
      );
      expect(
        await dataSource.getRepository(ModeloEscrito).findOneByOrFail({ id: modeloId }),
      ).toEqual(modeloBefore);
      expect(causaBefore.modificadoPorId).toBeNull();
      expect(modeloBefore.modificadoPorId).toBeNull();
      expect(await rowCounts()).toEqual(countsBefore);
    });

    it('la base no tiene ninguna tabla para guardar escritos completados', async () => {
      const tables = await tableNames();

      expect(tables).toContain('modelos_escritos');
      expect(tables.filter((name) => /escrito|completad|uso/i.test(name))).toEqual([
        'modelos_escritos',
      ]);
    });
  });
});
