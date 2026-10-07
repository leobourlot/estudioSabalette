import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Movimiento, type TipoMovimiento } from '../src/movimientos/movimiento.entity.js';
import { todayInBuenosAires } from '../src/movimientos/reglas-movimientos.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

interface Item {
  id: number;
  fecha: string;
  visible: boolean;
  anulado: boolean;
  esFechaFutura: boolean;
}

/** RF-23 a RF-26, RF-28: historial de movimientos de una causa. */
describe('historial de movimientos de una causa', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let session: TestSession;

  const list = (causaId: number | string, query: Record<string, string | number | boolean> = {}) =>
    request(app.getHttpServer())
      .get(`/api/panel/causas/${causaId}/movimientos`)
      .query(query)
      .set('Cookie', `access_token=${session.accessToken}`);

  const ids = (body: { items: Item[] }) => body.items.map((item) => item.id);

  const newCausa = (activa = true) =>
    createTestCausa(app, { responsableId: lawyer.id, creadoPorId: lawyer.id, activa });

  const movement = (
    causaId: number,
    data: {
      fecha?: string;
      tipo?: TipoMovimiento;
      visible?: boolean;
      anulado?: boolean;
      creadoEn?: Date;
    } = {},
  ) => createTestMovimiento(app, { causaId, creadoPorId: lawyer.id, ...data });

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
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('orden y paginado (RF-23)', () => {
    it('ordena por fecha, después por momento de carga y por último por id', async () => {
      const causa = await newCausa();
      const sameInstant = new Date('2026-01-10T12:00:00.123Z');
      const older = await movement(causa.id, { fecha: '2024-01-01' });
      const newer = await movement(causa.id, { fecha: '2024-06-01' });
      const loadedFirst = await movement(causa.id, {
        fecha: '2024-03-01',
        creadoEn: new Date('2026-01-01T12:00:00Z'),
      });
      const twinA = await movement(causa.id, { fecha: '2024-03-01', creadoEn: sameInstant });
      const twinB = await movement(causa.id, { fecha: '2024-03-01', creadoEn: sameInstant });

      const response = await list(causa.id).expect(200);

      expect(ids(response.body)).toEqual([newer.id, twinB.id, twinA.id, loadedFirst.id, older.id]);
      expect(response.body).toMatchObject({ total: 5, pagina: 1, porPagina: 20 });
    });

    it('con 45 movimientos, las tres páginas no repiten ni omiten ninguno', async () => {
      const causa = await newCausa();
      const instant = new Date('2026-02-01T10:00:00Z');
      const created: number[] = [];
      for (let index = 0; index < 45; index++) {
        // Muchos con la misma fecha y el mismo momento de carga: decide el id.
        const fecha = index % 3 === 0 ? '2024-05-05' : '2024-04-04';
        created.push((await movement(causa.id, { fecha, creadoEn: instant })).id);
      }

      const pages = await Promise.all([1, 2, 3].map((pagina) => list(causa.id, { pagina })));
      const seen = pages.flatMap((page) => ids(page.body));

      expect(pages.map((page) => page.body.items.length)).toEqual([20, 20, 5]);
      expect(new Set(seen).size).toBe(45);
      expect([...seen].sort((a, b) => a - b)).toEqual([...created].sort((a, b) => a - b));
    });

    it('muestra solo los movimientos de la causa indicada', async () => {
      const causa = await newCausa();
      const other = await newCausa();
      const own = await movement(causa.id);
      await movement(other.id);

      expect(ids((await list(causa.id).expect(200)).body)).toEqual([own.id]);
    });
  });

  describe('filtros (RF-25)', () => {
    let causaId: number;
    let visible: number;
    let hidden: number;
    let visibleAnnulled: number;
    let hiddenAnnulled: number;
    let audiencia: number;

    beforeAll(async () => {
      causaId = (await newCausa()).id;
      visible = (await movement(causaId, { fecha: '2024-01-10', visible: true })).id;
      hidden = (await movement(causaId, { fecha: '2024-02-10' })).id;
      visibleAnnulled = (
        await movement(causaId, { fecha: '2024-03-10', visible: true, anulado: true })
      ).id;
      hiddenAnnulled = (await movement(causaId, { fecha: '2024-04-10', anulado: true })).id;
      audiencia = (
        await movement(causaId, { fecha: '2024-05-10', tipo: 'audiencia', visible: true })
      ).id;
    });

    const filtered = async (query: Record<string, string | boolean>) =>
      ids((await list(causaId, query).expect(200)).body).sort((a, b) => a - b);
    const sorted = (...values: number[]) => values.sort((a, b) => a - b);

    it('sin filtros muestra todos, anulados incluidos', async () => {
      expect(await filtered({})).toEqual(
        sorted(visible, hidden, visibleAnnulled, hiddenAnnulled, audiencia),
      );
    });

    it('filtra por tipo', async () => {
      expect(await filtered({ tipo: 'audiencia' })).toEqual([audiencia]);
    });

    it('"visibles" incluye los anulados visibles', async () => {
      expect(await filtered({ visibilidad: 'visibles' })).toEqual(
        sorted(visible, visibleAnnulled, audiencia),
      );
    });

    it('"ocultos" muestra los no visibles, anulados incluidos', async () => {
      expect(await filtered({ visibilidad: 'ocultos' })).toEqual(sorted(hidden, hiddenAnnulled));
    });

    it('"ocultar anulados" no muestra ningún anulado, cualquiera sea su visibilidad', async () => {
      expect(await filtered({ ocultarAnulados: true })).toEqual(sorted(visible, hidden, audiencia));
      expect(await filtered({ ocultarAnulados: true, visibilidad: 'visibles' })).toEqual(
        sorted(visible, audiencia),
      );
    });

    it('filtra por rango de fechas, con ambos extremos incluidos', async () => {
      expect(await filtered({ desde: '2024-02-10', hasta: '2024-04-10' })).toEqual(
        sorted(hidden, visibleAnnulled, hiddenAnnulled),
      );
      expect(await filtered({ desde: '2024-04-10' })).toEqual(sorted(hiddenAnnulled, audiencia));
      expect(await filtered({ hasta: '2024-01-10' })).toEqual([visible]);
    });

    it('combina los filtros', async () => {
      expect(
        await filtered({ visibilidad: 'visibles', desde: '2024-03-01', ocultarAnulados: true }),
      ).toEqual([audiencia]);
    });

    it('rechaza la fecha desde posterior a la fecha hasta (RF-26)', async () => {
      const response = await list(causaId, { desde: '2024-05-01', hasta: '2024-04-01' }).expect(
        400,
      );
      expect(response.body.message).toEqual([
        'La fecha desde no puede ser posterior a la fecha hasta',
      ]);
    });
  });

  it('marca las fechas futuras con el día actual de Buenos Aires (RF-24)', async () => {
    const causa = await newCausa();
    const today = todayInBuenosAires();
    await movement(causa.id, { fecha: today });
    await movement(causa.id, { fecha: '2099-12-31' });

    const response = await list(causa.id).expect(200);

    expect(response.body.items.map((item: Item) => [item.fecha, item.esFechaFutura])).toEqual([
      ['2099-12-31', true],
      [today, false],
    ]);
  });

  it('devuelve las filas con su autor y sin datos de la cuenta (RF-24)', async () => {
    const causa = await newCausa();
    await movement(causa.id, { visible: true });
    await app
      .get(DataSource)
      .getRepository(Movimiento)
      .update({ causaId: causa.id }, { textoCliente: 'Texto para el cliente.' });

    const response = await list(causa.id).expect(200);

    expect(response.body.items[0]).toMatchObject({
      tipo: 'providencia',
      descripcion: 'Se fija audiencia preliminar.',
      visible: true,
      tieneTextoCliente: true,
      anulado: false,
      creadoPor: { id: lawyer.id, nombre: 'Luis', apellido: 'Sosa', activo: true },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/email|contrasena|textoCliente"/);
  });

  it('consulta el historial de una causa desactivada (RF-28)', async () => {
    const causa = await newCausa(false);
    const own = await movement(causa.id);

    expect(ids((await list(causa.id).expect(200)).body)).toEqual([own.id]);
  });

  it.each([
    ['inexistente', 999999],
    ['con id no numérico', 'abc'],
  ])('responde 404 para una causa %s', async (_case, id) => {
    const response = await list(id).expect(404);
    expect(response.body.message).toBe('No existe esa causa');
  });
});
