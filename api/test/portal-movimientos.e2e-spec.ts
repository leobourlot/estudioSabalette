import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Causa } from '../src/causas/causa.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

interface MovementItem {
  id: number;
  fecha: string;
  texto: string;
  anulado: boolean;
  esFechaFutura: boolean;
}

/** Movimientos de una causa en el portal (spec 004, RF-20 a RF-23, RF-26). */
describe('GET /api/portal/causas/:causaId/movimientos', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let client: Usuario;
  let causa: Causa;
  let accessToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    client = await createTestClient(app);
    causa = await createTestCausa(app, {
      caratula: 'Gómez c/ López s/ daños',
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ clienteId: client.id }],
    });
    ({ accessToken } = await loginAs(app, client.email!));
  });

  const movement = (
    data: {
      fecha?: string;
      visible?: boolean;
      anulado?: boolean;
      textoCliente?: string | null;
      creadoEn?: Date;
    } = {},
  ) =>
    createTestMovimiento(app, {
      causaId: causa.id,
      creadoPorId: lawyer.id,
      descripcion: 'Descripción técnica interna.',
      visible: true,
      ...data,
    });

  async function get(path: string, status = 200) {
    const response = await request(app.getHttpServer())
      .get(`/api/portal/causas/${causa.id}/movimientos${path}`)
      .set('Cookie', `access_token=${accessToken}`)
      .expect(status);
    return response.body;
  }

  it('muestra solo los visibles, anulados incluidos, en el orden del panel (RF-20)', async () => {
    const older = await movement({ fecha: '2024-01-01' });
    await movement({ fecha: '2024-02-01', visible: false });
    const annulled = await movement({ fecha: '2024-03-01', anulado: true });
    const sameDayFirst = await movement({
      fecha: '2024-04-01',
      creadoEn: new Date('2026-01-01T10:00:00Z'),
    });
    const sameDayLast = await movement({
      fecha: '2024-04-01',
      creadoEn: new Date('2026-01-02T10:00:00Z'),
    });

    const page = await get('');

    expect(page.items.map((item: MovementItem) => [item.id, item.anulado])).toEqual([
      [sameDayLast.id, false],
      [sameDayFirst.id, false],
      [annulled.id, true],
      [older.id, false],
    ]);
  });

  it('muestra el texto para el cliente o, si no hay, la descripción, sin más datos (RF-21, RF-30)', async () => {
    const withText = await movement({
      fecha: '2024-02-01',
      textoCliente: 'El juez fijó audiencia.',
    });
    await movement({ fecha: '2024-01-01' });

    const page = await get('');

    expect(page.items).toEqual([
      {
        id: withText.id,
        fecha: '2024-02-01',
        tipo: 'providencia',
        texto: 'El juez fijó audiencia.',
        anulado: false,
        esFechaFutura: false,
      },
      expect.objectContaining({ fecha: '2024-01-01', texto: 'Descripción técnica interna.' }),
    ]);
    expect(JSON.stringify(page.items[0])).not.toContain('Descripción técnica');
  });

  it('marca la fecha futura, salvo en un movimiento anulado (RF-21)', async () => {
    const future = await movement({ fecha: '2099-01-01' });
    const annulledFuture = await movement({ fecha: '2099-01-02', anulado: true });

    const flags = Object.fromEntries(
      (await get('')).items.map((item: MovementItem) => [item.id, item.esFechaFutura]),
    );

    expect(flags).toEqual({ [future.id]: true, [annulledFuture.id]: false });
  });

  it('con 45 visibles y 10 ocultos, pagina solo los visibles y no informa totales (RF-24, RF-26)', async () => {
    const visibles: number[] = [];
    for (let i = 0; i < 45; i++) {
      visibles.push(
        (await movement({ fecha: '2024-01-01', creadoEn: new Date(Date.UTC(2026, 0, 1, 0, i)) }))
          .id,
      );
    }
    for (let i = 0; i < 10; i++) await movement({ fecha: '2025-01-01', visible: false });

    const pages = [await get(''), await get('?pagina=2'), await get('?pagina=3')];

    expect(pages.map((page) => [page.pagina, page.items.length, page.haySiguiente])).toEqual([
      [1, 20, true],
      [2, 20, true],
      [3, 5, false],
    ]);
    expect(pages.flatMap((page) => page.items.map((item: MovementItem) => item.id))).toEqual(
      [...visibles].reverse(),
    );
    for (const page of pages)
      expect(Object.keys(page).sort()).toEqual(['haySiguiente', 'items', 'pagina']);
    expect((await get('?pagina=4')).items).toEqual([]);
  });

  it('una causa sin movimientos visibles devuelve la lista vacía (RF-23)', async () => {
    await movement({ visible: false });

    expect(await get('')).toEqual({ items: [], pagina: 1, haySiguiente: false });
  });

  it('una página inválida responde 400', async () => {
    const body = await get('?pagina=0', 400);

    expect(body.message).toEqual(['La página debe ser un número entero mayor o igual a 1']);
  });

  it('el detalle de un movimiento suma solo el id y la carátula de su causa (RF-22)', async () => {
    const created = await movement({ fecha: '2024-05-01', textoCliente: 'Texto para el cliente.' });

    expect(await get(`/${created.id}`)).toEqual({
      id: created.id,
      fecha: '2024-05-01',
      tipo: 'providencia',
      texto: 'Texto para el cliente.',
      anulado: false,
      esFechaFutura: false,
      causa: { id: causa.id, caratula: 'Gómez c/ López s/ daños' },
    });
  });
});
