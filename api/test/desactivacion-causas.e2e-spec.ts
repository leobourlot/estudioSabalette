import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Causa } from '../src/causas/causa.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';
const COURT = 'Juzgado Civil N° 3';

/** RF-40 a RF-43: desactivar y reactivar causas. */
describe('POST /api/panel/causas/:id/desactivar y /reactivar', () => {
  let app: NestExpressApplication;
  let creator: Usuario;
  let lawyer: Usuario;
  let session: TestSession;

  const withSession = (call: request.Test) =>
    call.set('Cookie', `access_token=${session.accessToken}`);
  const deactivate = (id: number | string) =>
    withSession(request(app.getHttpServer()).post(`${CAUSAS}/${id}/desactivar`));
  const reactivate = (id: number | string, body: object = {}) =>
    withSession(request(app.getHttpServer()).post(`${CAUSAS}/${id}/reactivar`)).send(body);
  const getCausa = (id: number) => withSession(request(app.getHttpServer()).get(`${CAUSAS}/${id}`));

  const existing = (changes: Partial<Causa> = {}) =>
    createTestCausa(app, {
      juzgado: COURT,
      responsableId: creator.id,
      creadoPorId: creator.id,
      ...changes,
    });

  const caseKeyOf = async (id: number) => {
    const [row]: { claveExpediente: string | null }[] = await app
      .get(DataSource)
      .query('SELECT claveExpediente FROM causas WHERE id = ?', [id]);
    return row.claveExpediente;
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    creator = await createTestUser(app, {
      email: 'carla@estudio.com',
      nombre: 'Carla',
      apellido: 'Sabalette',
    });
    lawyer = await createTestUser(app, {
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Álvarez',
    });
    session = await loginAs(app, 'juan@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('desactivar (RF-40)', () => {
    it('marca la causa como desactivada, registra quién y cuándo, y libera su número', async () => {
      const causa = await existing({ numeroExpediente: '1/2024' });
      const before = Date.now();

      await deactivate(causa.id).expect(204);

      const response = await getCausa(causa.id).expect(200);
      expect(response.body).toMatchObject({
        activa: false,
        desactivadaPor: { id: lawyer.id, nombre: 'Juan', apellido: 'Álvarez' },
        modificadoPor: { id: lawyer.id },
        reactivadaPor: null,
      });
      expect(new Date(response.body.desactivadaEn).getTime()).toBeGreaterThanOrEqual(before - 2000);
      expect(await caseKeyOf(causa.id)).toBeNull();
    });

    it('repetir la desactivación no es un error y no cambia el registro', async () => {
      const causa = await existing();
      await deactivate(causa.id).expect(204);
      const first = await getCausa(causa.id).expect(200);

      await deactivate(causa.id).expect(204);

      const second = await getCausa(causa.id).expect(200);
      expect(second.body.desactivadaEn).toBe(first.body.desactivadaEn);
      expect(second.body.modificadoEn).toBe(first.body.modificadoEn);
    });

    it.each(['99999', 'abc'])('responde 404 a la causa %s', async (id) => {
      const response = await deactivate(id).expect(404);

      expect(response.body.message).toBe('No existe esa causa');
    });
  });

  describe('reactivar (RF-42, RF-43)', () => {
    it('marca la causa como activa y registra quién y cuándo', async () => {
      const causa = await existing({ numeroExpediente: '2/2024' });
      await deactivate(causa.id).expect(204);
      const before = Date.now();

      await reactivate(causa.id).expect(204);

      const response = await getCausa(causa.id).expect(200);
      expect(response.body).toMatchObject({
        activa: true,
        reactivadaPor: { id: lawyer.id },
        desactivadaPor: { id: lawyer.id },
      });
      expect(new Date(response.body.reactivadaEn).getTime()).toBeGreaterThanOrEqual(before - 2000);
      expect(await caseKeyOf(causa.id)).toBe(`civil|${COURT}|2/2024`);
    });

    it('rechaza reactivar una causa activa', async () => {
      const causa = await existing();

      const response = await reactivate(causa.id).expect(409);

      expect(response.body.message).toBe('La causa ya está activa');
    });

    it('pregunta si el número está en otra causa activa, y reactiva al confirmar', async () => {
      const causa = await existing({ numeroExpediente: '3/2024', activa: false });
      await existing({ numeroExpediente: '3/2024', juzgado: 'Juzgado Laboral N° 1' });

      const question = await reactivate(causa.id).expect(409);
      expect(question.body).toEqual({
        statusCode: 409,
        message: 'Ya existe otra causa con ese número de expediente',
        codigo: 'EXPEDIENTE_REPETIDO',
      });

      await reactivate(causa.id, { confirmarExpedienteRepetido: true }).expect(204);
    });

    it('con un duplicado exacto, primero pregunta y al confirmar rechaza la reactivación', async () => {
      const causa = await existing({ numeroExpediente: '4/2024', activa: false });
      await existing({ numeroExpediente: '4/2024' });

      const question = await reactivate(causa.id).expect(409);
      expect(question.body.codigo).toBe('EXPEDIENTE_REPETIDO');

      const rejection = await reactivate(causa.id, { confirmarExpedienteRepetido: true }).expect(
        409,
      );
      expect(rejection.body.message).toBe(
        'Ya existe una causa con ese número de expediente en ese juzgado y fuero',
      );
      expect(rejection.body).not.toHaveProperty('codigo');
      expect((await getCausa(causa.id).expect(200)).body.activa).toBe(false);
    });

    it('un incidente se reactiva sin preguntar aunque repita el número', async () => {
      const causa = await existing({
        numeroExpediente: '5/2024',
        esIncidente: true,
        expedientePrincipal: '5/2024',
        activa: false,
      });
      await existing({ numeroExpediente: '5/2024' });

      await reactivate(causa.id).expect(204);
    });

    it('valida el cuerpo', async () => {
      const causa = await existing({ activa: false });

      const response = await reactivate(causa.id, { confirmarExpedienteRepetido: 'si' }).expect(
        400,
      );

      expect(response.body.message).toEqual(['La confirmación debe ser true o false']);
    });
  });
});
