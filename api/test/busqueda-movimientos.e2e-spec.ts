import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

/** RF-27: buscador del historial de movimientos. */
describe('búsqueda en el historial de movimientos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;
  let causaId: number;
  let notificacion: number;
  let audiencia: number;
  let percent: number;
  let underscore: number;

  const search = (query: Record<string, string | boolean>, causa = causaId) =>
    request(app.getHttpServer())
      .get(`/api/panel/causas/${causa}/movimientos`)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`)
      .expect(200)
      .then((response) =>
        response.body.items
          .map((item: { id: number }) => item.id)
          .sort((a: number, b: number) => a - b),
      );

  const movement = (
    causa: number,
    descripcion: string,
    textoCliente: string | null = null,
    visible = false,
  ) =>
    createTestMovimiento(app, {
      causaId: causa,
      creadoPorId: lawyer.id,
      descripcion,
      textoCliente,
      visible,
    }).then((created) => created.id);

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
    causaId = (await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id })).id;
    notificacion = await movement(causaId, 'Se libró cédula de notificación a la demandada.');
    audiencia = await movement(
      causaId,
      'Providencia que fija fecha.',
      'El juez fijó una Audiencia para noviembre.',
      true,
    );
    percent = await movement(causaId, 'Honorarios regulados en el 20 % del monto.');
    underscore = await movement(causaId, 'Expediente digital ref_45.');
    await movement(causaId, 'Otro movimiento sin relación.');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('busca fragmentos en la descripción', async () => {
    expect(await search({ buscar: 'cédula' })).toEqual([notificacion]);
    expect(await search({ buscar: 'ficac' })).toEqual([notificacion]);
  });

  it('busca en el texto para el cliente', async () => {
    expect(await search({ buscar: 'noviembre' })).toEqual([audiencia]);
  });

  it('no distingue mayúsculas, minúsculas ni tildes', async () => {
    expect(await search({ buscar: 'NOTIFICACION' })).toEqual([notificacion]);
    expect(await search({ buscar: 'audiencia' })).toEqual([audiencia]);
    expect(await search({ buscar: 'CEDULA' })).toEqual([notificacion]);
  });

  it('busca % y _ como texto, no como comodines', async () => {
    expect(await search({ buscar: '20 %' })).toEqual([percent]);
    expect(await search({ buscar: '%' })).toEqual([percent]);
    expect(await search({ buscar: 'ref_45' })).toEqual([underscore]);
    expect(await search({ buscar: '_' })).toEqual([underscore]);
  });

  it('busca solo en los movimientos de la causa indicada', async () => {
    const other = (await createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id }))
      .id;
    const foreign = await movement(other, 'Cédula de notificación en otra causa.');

    expect(await search({ buscar: 'cédula' })).toEqual([notificacion]);
    expect(await search({ buscar: 'cédula' }, other)).toEqual([foreign]);
  });

  it('se combina con los filtros', async () => {
    expect(await search({ buscar: 'fecha', visibilidad: 'visibles' })).toEqual([audiencia]);
    expect(await search({ buscar: 'fecha', visibilidad: 'ocultos' })).toEqual([]);
  });

  it('sin coincidencias devuelve una página vacía', async () => {
    expect(await search({ buscar: 'inexistente' })).toEqual([]);
  });
});
