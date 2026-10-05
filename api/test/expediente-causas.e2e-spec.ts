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
const DUPLICATE = 'Ya existe una causa con ese número de expediente en ese juzgado y fuero';
const REPEATED = 'Ya existe otra causa con ese número de expediente';
const COURT = 'Juzgado Civil N° 3';

/** RF-8 a RF-10: número de expediente duplicado o repetido en el alta. */
describe('POST /api/panel/causas: control de expediente', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;

  const post = (body: object) =>
    request(app.getHttpServer())
      .post(CAUSAS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send(body);

  const newCase = (changes: object) => ({
    caratula: 'Pérez c/ Gómez s/ daños',
    fuero: 'civil',
    juzgado: COURT,
    responsableId: lawyer.id,
    partes: [{ rol: 'actor', tipoPersona: 'fisica', nombre: 'Juan', apellido: 'Pérez' }],
    ...changes,
  });

  const existing = (changes: Partial<Causa>) =>
    createTestCausa(app, {
      juzgado: COURT,
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      ...changes,
    });

  const countWithNumber = async (numeroExpediente: string) => {
    const [row]: { total: string }[] = await app
      .get(DataSource)
      .query('SELECT COUNT(*) AS total FROM causas WHERE numeroExpediente = ?', [numeroExpediente]);
    return Number(row.total);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    lawyer = await createTestUser(app, { email: 'juan@estudio.com' });
    session = await loginAs(app, 'juan@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('duplicado en el mismo juzgado y fuero (RF-8)', () => {
    it('rechaza el mismo número aunque cambien mayúsculas, tildes y espacios', async () => {
      await existing({ numeroExpediente: 'A-55/2024' });

      const response = await post(
        newCase({ numeroExpediente: ' a-55/2024 ', juzgado: '  juzgado civíl n° 3 ' }),
      ).expect(409);

      expect(response.body).toMatchObject({ statusCode: 409, message: DUPLICATE });
      expect(response.body).not.toHaveProperty('codigo');
    });

    it('rechaza aunque se confirme la pregunta: dos causas así no pueden estar activas', async () => {
      await existing({ numeroExpediente: '56/2024' });

      const response = await post(
        newCase({ numeroExpediente: '56/2024', confirmarExpedienteRepetido: true }),
      ).expect(409);

      expect(response.body.message).toBe(DUPLICATE);
    });

    it('de dos altas simultáneas con la misma clave, solo una se guarda', async () => {
      const body = newCase({ numeroExpediente: '57/2024' });

      const responses = await Promise.all([post(body), post(body)]);

      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
      expect(responses.find((response) => response.status === 409)?.body.message).toBe(DUPLICATE);
      expect(await countWithNumber('57/2024')).toBe(1);
    });
  });

  describe('número repetido en otra causa (RF-9)', () => {
    it.each<[string, Partial<Causa>, object]>([
      ['otro juzgado', { numeroExpediente: '60/2024', juzgado: 'Juzgado Laboral N° 1' }, {}],
      ['otro fuero', { numeroExpediente: '61/2024', fuero: 'familia' }, {}],
      ['la causa existente sin juzgado', { numeroExpediente: '62/2024', juzgado: null }, {}],
      ['la causa nueva sin juzgado', { numeroExpediente: '63/2024' }, { juzgado: null }],
    ])('pregunta antes de guardar si el número está en %s', async (_case, other, changes) => {
      await existing(other);
      const numeroExpediente = other.numeroExpediente!;

      const response = await post(newCase({ numeroExpediente, ...changes })).expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        message: REPEATED,
        codigo: 'EXPEDIENTE_REPETIDO',
      });
      expect(await countWithNumber(numeroExpediente)).toBe(1);
    });

    it('guarda si el integrante confirma', async () => {
      await existing({ numeroExpediente: '64/2024', juzgado: 'Juzgado Laboral N° 1' });

      const response = await post(
        newCase({ numeroExpediente: '64/2024', confirmarExpedienteRepetido: true }),
      ).expect(201);

      expect(response.body.causa.numeroExpediente).toBe('64/2024');
      expect(await countWithNumber('64/2024')).toBe(2);
    });
  });

  describe('sin rechazo ni pregunta', () => {
    it('un incidente puede repetir el número de su expediente principal (RF-10)', async () => {
      await existing({ numeroExpediente: '70/2024' });

      await post(
        newCase({ numeroExpediente: '70/2024', esIncidente: true, expedientePrincipal: '70/2024' }),
      ).expect(201);
      await post(
        newCase({ numeroExpediente: '70/2024', esIncidente: true, expedientePrincipal: '70/2024' }),
      ).expect(201);
    });

    it('un incidente existente no genera la pregunta a una causa nueva (RF-9)', async () => {
      await existing({
        numeroExpediente: '71/2024',
        esIncidente: true,
        expedientePrincipal: '1/2020',
      });

      await post(newCase({ numeroExpediente: '71/2024' })).expect(201);
    });

    it('"72-2024" y "72/2024" no son el mismo número', async () => {
      await existing({ numeroExpediente: '72/2024' });

      await post(newCase({ numeroExpediente: '72-2024' })).expect(201);
    });

    it('el número de una causa desactivada no cuenta', async () => {
      await existing({ numeroExpediente: '73/2024', activa: false });

      await post(newCase({ numeroExpediente: '73/2024' })).expect(201);
    });

    it('varias causas sin número no son duplicadas', async () => {
      await post(newCase({ numeroExpediente: null })).expect(201);
      await post(newCase({ numeroExpediente: null })).expect(201);
    });
  });
});
