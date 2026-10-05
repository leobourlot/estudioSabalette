import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';

const NATURAL_PERSON = { rol: 'actor', tipoPersona: 'fisica', nombre: 'Juan', apellido: 'Pérez' };
const LEGAL_PERSON = {
  rol: 'demandado',
  tipoPersona: 'juridica',
  razonSocial: 'Gómez S.A.',
  cuit: '30-71234567-1',
};

/** RF-2, RF-6, RF-12, RF-29: alta básica y consulta de una causa. */
describe('POST y GET /api/panel/causas', () => {
  let app: NestExpressApplication;
  let admin: Usuario;
  let lawyer: Usuario;
  let colleague: Usuario;
  let client: Usuario;
  let lawyerSession: TestSession;

  const post = (body: object, session = lawyerSession) =>
    request(app.getHttpServer())
      .post(CAUSAS)
      .set('Cookie', `access_token=${session.accessToken}`)
      .send(body);

  const get = (id: number | string, session = lawyerSession) =>
    request(app.getHttpServer())
      .get(`${CAUSAS}/${id}`)
      .set('Cookie', `access_token=${session.accessToken}`);

  const minimal = () => ({
    caratula: 'Pérez, Juan c/ Gómez S.A. s/ daños y perjuicios',
    fuero: 'civil',
    responsableId: lawyer.id,
    partes: [NATURAL_PERSON],
  });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    admin = await createTestUser(app, {
      rol: 'admin',
      email: 'carla@estudio.com',
      nombre: 'Carla',
      apellido: 'Sabalette',
    });
    lawyer = await createTestUser(app, {
      email: 'juan@estudio.com',
      nombre: 'Juan',
      apellido: 'Álvarez',
    });
    colleague = await createTestUser(app, {
      email: 'lucia@estudio.com',
      nombre: 'Lucía',
      apellido: 'Benítez',
    });
    client = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });

    lawyerSession = await loginAs(app, 'juan@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('crea una causa con los datos obligatorios, en trámite y activa (RF-6)', async () => {
    const response = await post(minimal()).expect(201);

    expect(response.body.rechazos).toEqual([]);
    expect(response.body.causasComoNoCliente).toEqual([]);
    expect(response.body.causa).toMatchObject({
      caratula: 'Pérez, Juan c/ Gómez S.A. s/ daños y perjuicios',
      numeroExpediente: null,
      juzgado: null,
      fuero: 'civil',
      estado: 'en_tramite',
      esIncidente: false,
      expedientePrincipal: null,
      activa: true,
      responsable: {
        id: lawyer.id,
        nombre: 'Juan',
        apellido: 'Álvarez',
        rol: 'abogado',
        activo: true,
      },
      colaboradores: [],
      partesDesvinculadas: [],
    });
    expect(response.body.causa.partes).toEqual([
      expect.objectContaining({
        rol: 'actor',
        esCliente: false,
        tipoPersona: 'fisica',
        nombre: 'Juan',
        apellido: 'Pérez',
      }),
    ]);
  });

  it('registra quién creó la causa y cuándo (RF-2)', async () => {
    const before = Date.now();
    const response = await post(minimal()).expect(201);

    expect(response.body.causa.creadoPor).toEqual({
      id: lawyer.id,
      nombre: 'Juan',
      apellido: 'Álvarez',
    });
    expect(response.body.causa.modificadoPor).toBeNull();
    expect(response.body.causa.modificadoEn).toBeNull();
    expect(new Date(response.body.causa.creadoEn).getTime()).toBeGreaterThanOrEqual(before - 2000);
  });

  it('guarda todos los datos, los colaboradores y varias partes', async () => {
    const response = await post({
      ...minimal(),
      caratula: '  Pérez c/ Gómez  ',
      numeroExpediente: ' 1234/2024 ',
      juzgado: 'Juzgado Civil y Comercial N° 3',
      fuero: 'laboral',
      estado: 'paralizada',
      esIncidente: true,
      expedientePrincipal: '1000/2023',
      responsableId: admin.id,
      colaboradorIds: [colleague.id, lawyer.id],
      partes: [NATURAL_PERSON, LEGAL_PERSON],
    }).expect(201);

    const { causa } = response.body;
    expect(causa).toMatchObject({
      caratula: 'Pérez c/ Gómez',
      numeroExpediente: '1234/2024',
      juzgado: 'Juzgado Civil y Comercial N° 3',
      fuero: 'laboral',
      estado: 'paralizada',
      esIncidente: true,
      expedientePrincipal: '1000/2023',
      responsable: { id: admin.id, rol: 'admin' },
    });
    expect(causa.colaboradores.map((member: { apellido: string }) => member.apellido)).toEqual([
      'Álvarez',
      'Benítez',
    ]);
    expect(causa.partes).toEqual([
      expect.objectContaining({ rol: 'actor', nombre: 'Juan' }),
      expect.objectContaining({
        rol: 'demandado',
        tipoPersona: 'juridica',
        razonSocial: 'Gómez S.A.',
        cuit: '30712345671',
      }),
    ]);

    // El número para búsqueda se guarda sin separadores (RF-37).
    const [row]: { numeroExpedienteBusqueda: string }[] = await app
      .get(DataSource)
      .query('SELECT numeroExpedienteBusqueda FROM causas WHERE id = ?', [causa.id]);
    expect(row.numeroExpedienteBusqueda).toBe('12342024');
  });

  it('GET /:id devuelve el mismo detalle que el alta (RF-12)', async () => {
    const created = await post({ ...minimal(), colaboradorIds: [colleague.id] }).expect(201);

    const response = await get(created.body.causa.id).expect(200);

    expect(response.body).toEqual(created.body.causa);
  });

  it('nunca incluye emails ni hashes de las cuentas', async () => {
    const created = await post({ ...minimal(), colaboradorIds: [colleague.id] }).expect(201);
    const response = await get(created.body.causa.id).expect(200);

    expect(JSON.stringify(created.body)).not.toContain('@');
    expect(JSON.stringify(response.body)).not.toMatch(/@|\$2b\$/);
  });

  it('rechaza el alta sin partes (RF-6)', async () => {
    const response = await post({ ...minimal(), partes: [] }).expect(400);

    expect(response.body.message).toEqual(['La causa debe tener al menos una parte']);
  });

  it('rechaza el alta con datos inválidos', async () => {
    const response = await post({ ...minimal(), caratula: '', fuero: 'comercial' }).expect(400);

    expect(response.body.message).toEqual([
      'La carátula es obligatoria',
      'El fuero debe ser civil, penal, familia, laboral, federal u otro',
    ]);
  });

  it('rechaza un responsable que no es integrante del estudio (RF-29)', async () => {
    const asClient = await post({ ...minimal(), responsableId: client.id }).expect(400);
    const missing = await post({ ...minimal(), responsableId: 99999 }).expect(400);

    expect(asClient.body.message).toBe('El responsable debe ser un integrante del estudio');
    expect(missing.body.message).toBe('El responsable debe ser un integrante del estudio');
  });

  it('no deja causas a medio crear si el alta falla', async () => {
    const before: { total: string }[] = await app
      .get(DataSource)
      .query('SELECT COUNT(*) AS total FROM causas');

    await post({ ...minimal(), responsableId: client.id }).expect(400);

    const after: { total: string }[] = await app
      .get(DataSource)
      .query('SELECT COUNT(*) AS total FROM causas');
    expect(after[0].total).toBe(before[0].total);
  });

  it.each(['99999', 'abc'])('responde 404 a la causa %s', async (id) => {
    const response = await get(id).expect(404);

    expect(response.body.message).toBe('No existe esa causa');
  });
});
