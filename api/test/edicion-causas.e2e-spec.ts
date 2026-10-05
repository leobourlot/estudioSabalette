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

/** RF-2, RF-8 a RF-11, RF-41: modificación de los datos de una causa. */
describe('PATCH /api/panel/causas/:id', () => {
  let app: NestExpressApplication;
  let creator: Usuario;
  let editor: Usuario;
  let session: TestSession;

  const patch = (id: number | string, body: object) =>
    request(app.getHttpServer())
      .patch(`${CAUSAS}/${id}`)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send(body);

  const existing = (changes: Partial<Causa> = {}) =>
    createTestCausa(app, {
      caratula: 'Pérez c/ Gómez s/ daños',
      juzgado: COURT,
      responsableId: creator.id,
      creadoPorId: creator.id,
      ...changes,
    });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    creator = await createTestUser(app, {
      email: 'carla@estudio.com',
      nombre: 'Carla',
      apellido: 'Sabalette',
    });
    editor = await createTestUser(app, {
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Álvarez',
    });
    session = await loginAs(app, 'juan@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('modifica los datos enviados, deja los demás y registra quién la modificó (RF-2, RF-11)', async () => {
    const causa = await existing({ numeroExpediente: '1/2024', estado: 'en_tramite' });
    const before = Date.now();

    const response = await patch(causa.id, {
      caratula: ' Pérez c/ Gómez s/ cobro ',
      estado: 'finalizada',
    }).expect(200);

    expect(response.body).toMatchObject({
      id: causa.id,
      caratula: 'Pérez c/ Gómez s/ cobro',
      estado: 'finalizada',
      numeroExpediente: '1/2024',
      juzgado: COURT,
      creadoPor: { id: creator.id },
      modificadoPor: { id: editor.id, nombre: 'Juan', apellido: 'Álvarez' },
    });
    expect(new Date(response.body.modificadoEn).getTime()).toBeGreaterThanOrEqual(before - 2000);
  });

  it('null o texto vacío borran un dato opcional, y se recalcula el número para búsqueda', async () => {
    const causa = await existing({ numeroExpediente: '2/2024' });

    const cleared = await patch(causa.id, { juzgado: '', numeroExpediente: null }).expect(200);
    expect(cleared.body).toMatchObject({ juzgado: null, numeroExpediente: null });

    await patch(causa.id, { numeroExpediente: '2-2024 B' }).expect(200);
    const [row]: { numeroExpedienteBusqueda: string }[] = await app
      .get(DataSource)
      .query('SELECT numeroExpedienteBusqueda FROM causas WHERE id = ?', [causa.id]);
    expect(row.numeroExpedienteBusqueda).toBe('22024B');
  });

  describe('incidente (RF-10)', () => {
    it('quitar la marca de incidente borra el número del expediente principal', async () => {
      const causa = await existing({ esIncidente: true, expedientePrincipal: '100/2020' });

      const response = await patch(causa.id, { esIncidente: false }).expect(200);

      expect(response.body).toMatchObject({ esIncidente: false, expedientePrincipal: null });
    });

    it('marcar como incidente exige el número del expediente principal', async () => {
      const causa = await existing();

      const response = await patch(causa.id, { esIncidente: true }).expect(400);
      expect(response.body.message).toBe('Indicá el número del expediente principal');

      await patch(causa.id, { esIncidente: true, expedientePrincipal: '100/2020' }).expect(200);
    });

    it('no acepta el número del expediente principal en una causa que no es incidente', async () => {
      const causa = await existing();

      const response = await patch(causa.id, { expedientePrincipal: '100/2020' }).expect(400);

      expect(response.body.message).toBe('Solo un incidente lleva número de expediente principal');
    });

    it('permite cambiar el número del expediente principal de un incidente', async () => {
      const causa = await existing({ esIncidente: true, expedientePrincipal: '100/2020' });

      const response = await patch(causa.id, { expedientePrincipal: '101/2020' }).expect(200);

      expect(response.body.expedientePrincipal).toBe('101/2020');
    });
  });

  describe('control de expediente (RF-8, RF-9)', () => {
    it('rechaza el número de otra causa del mismo juzgado y fuero', async () => {
      await existing({ numeroExpediente: '10/2024' });
      const causa = await existing({ numeroExpediente: '11/2024' });

      const response = await patch(causa.id, { numeroExpediente: '10/2024' }).expect(409);

      expect(response.body.message).toBe(
        'Ya existe una causa con ese número de expediente en ese juzgado y fuero',
      );
    });

    it('rechaza cambiar el juzgado o el fuero si choca con otra causa', async () => {
      await existing({ numeroExpediente: '12/2024', juzgado: 'Juzgado Laboral N° 1' });
      const causa = await existing({ numeroExpediente: '12/2024', fuero: 'familia' });

      // Mismo número en otro juzgado y otro fuero: al igualar los dos, es duplicado.
      await patch(causa.id, {
        juzgado: 'Juzgado Laboral N° 1',
        fuero: 'civil',
        confirmarExpedienteRepetido: true,
      }).expect(409);
    });

    it('pregunta si el número está en otro juzgado, y guarda al confirmar', async () => {
      await existing({ numeroExpediente: '13/2024', juzgado: 'Juzgado Laboral N° 1' });
      const causa = await existing();

      const question = await patch(causa.id, { numeroExpediente: '13/2024' }).expect(409);
      expect(question.body).toEqual({
        statusCode: 409,
        message: 'Ya existe otra causa con ese número de expediente',
        codigo: 'EXPEDIENTE_REPETIDO',
      });

      await patch(causa.id, {
        numeroExpediente: '13/2024',
        confirmarExpedienteRepetido: true,
      }).expect(200);
    });

    it('no vuelve a preguntar si no cambian número, juzgado, fuero ni la marca de incidente', async () => {
      await existing({ numeroExpediente: '14/2024', juzgado: 'Juzgado Laboral N° 1' });
      const causa = await existing({ numeroExpediente: '14/2024' });

      await patch(causa.id, { estado: 'paralizada', caratula: 'Otra carátula' }).expect(200);
    });

    it('la propia causa no cuenta como duplicada', async () => {
      const causa = await existing({ numeroExpediente: '15/2024' });

      await patch(causa.id, { numeroExpediente: '15/2024', juzgado: COURT }).expect(200);
    });
  });

  it('no permite activar ni desactivar con la modificación (RF-11)', async () => {
    const causa = await existing();

    const response = await patch(causa.id, { activa: false }).expect(400);

    expect(response.body.message).toEqual(['El campo activa no está permitido']);
  });

  it('rechaza modificar una causa desactivada (RF-41)', async () => {
    const causa = await existing({ activa: false });

    const response = await patch(causa.id, { estado: 'finalizada' }).expect(409);

    expect(response.body.message).toBe('La causa está desactivada. Reactivala para modificarla');
  });

  it.each(['99999', 'abc'])('responde 404 a la causa %s', async (id) => {
    const response = await patch(id, { estado: 'finalizada' }).expect(404);

    expect(response.body.message).toBe('No existe esa causa');
  });
});
