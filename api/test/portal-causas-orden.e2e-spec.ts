import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Causa, EstadoCausa } from '../src/causas/causa.entity.js';
import { PortalService } from '../src/portal/portal.service.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables, createTestMovimiento } from './utilidades/movimientos-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

const LIST = '/api/portal/causas';

interface ListItem {
  id: number;
  grupo: string;
  fechaUltimoMovimiento: string | null;
}

/** Orden y paginación de la lista de causas del portal (spec 004, RF-8, RF-10, RF-11, RF-24, RF-25). */
describe('GET /api/portal/causas: orden y paginación', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let client: Usuario;

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
  });

  const causaOf = (caratula: string, estado: EstadoCausa = 'en_tramite') =>
    createTestCausa(app, {
      caratula,
      estado,
      responsableId: lawyer.id,
      creadoPorId: lawyer.id,
      partes: [{ clienteId: client.id }],
    });

  const movement = (
    causa: Causa,
    fecha: string,
    data: { visible?: boolean; anulado?: boolean } = {},
  ) =>
    createTestMovimiento(app, {
      causaId: causa.id,
      creadoPorId: lawyer.id,
      fecha,
      visible: data.visible ?? true,
      anulado: data.anulado ?? false,
    });

  async function list(query = '') {
    const { accessToken } = await loginAs(app, client.email!);
    const response = await request(app.getHttpServer())
      .get(`${LIST}${query}`)
      .set('Cookie', `access_token=${accessToken}`)
      .expect(200);
    return response.body as { items: ListItem[]; pagina: number; haySiguiente: boolean };
  }

  it('agrupa y ordena por fecha del último movimiento; sin fecha, al final del grupo por carátula', async () => {
    const reciente = await causaOf('Mendez c/ Ruiz', 'paralizada');
    const vieja = await causaOf('Lopez c/ Diaz');
    const alfa = await causaOf('Alfa c/ Beta');
    const soloOcultos = await causaOf('Beta c/ Gamma');
    const archivada = await causaOf('Zeta c/ Omega', 'archivada');
    const finalizada = await causaOf('Abad c/ Paz', 'finalizada');
    await movement(reciente, '2025-01-01');
    await movement(vieja, '2024-03-01');
    await movement(archivada, '2026-01-01');
    // Ni ocultos, ni anulados, ni de fecha futura cuentan para la fecha del último movimiento.
    await movement(soloOcultos, '2026-05-01', { visible: false });
    await movement(soloOcultos, '2026-06-01', { anulado: true });
    await movement(soloOcultos, '2099-01-01');

    const { items } = await list();

    expect(items.map((item) => [item.id, item.grupo, item.fechaUltimoMovimiento])).toEqual([
      [reciente.id, 'en_curso', '2025-01-01'],
      [vieja.id, 'en_curso', '2024-03-01'],
      [alfa.id, 'en_curso', null],
      [soloOcultos.id, 'en_curso', null],
      [archivada.id, 'archivadas_y_finalizadas', '2026-01-01'],
      [finalizada.id, 'archivadas_y_finalizadas', null],
    ]);
  });

  it('la fecha del último movimiento cambia al pasar el día en Buenos Aires', async () => {
    const causa = await causaOf('Pérez c/ Gómez');
    await movement(causa, '2026-10-01');
    await movement(causa, '2026-10-09');
    const portal = app.get(PortalService);

    // 02:59 UTC del 9 es todavía el 8 en Buenos Aires; 03:00 UTC ya es el 9.
    const before = await portal.listCausas(client.id, 1, new Date('2026-10-09T02:59:00Z'));
    const after = await portal.listCausas(client.id, 1, new Date('2026-10-09T03:00:00Z'));

    expect(before.items[0].fechaUltimoMovimiento).toBe('2026-10-01');
    expect(after.items[0].fechaUltimoMovimiento).toBe('2026-10-09');
  });

  it('con 45 causas, las tres páginas no repiten ni omiten ninguna y no informan totales', async () => {
    const created: number[] = [];
    for (let i = 0; i < 45; i++) {
      // La misma carátula en todas: el desempate por registro tiene que dejar el orden fijo.
      created.push((await causaOf('Pérez c/ Gómez')).id);
    }

    const pages = [await list(), await list('?pagina=2'), await list('?pagina=3')];

    expect(pages.map((page) => [page.pagina, page.items.length, page.haySiguiente])).toEqual([
      [1, 20, true],
      [2, 20, true],
      [3, 5, false],
    ]);
    const seen = pages.flatMap((page) => page.items.map((item) => item.id));
    expect(seen).toEqual([...created].sort((a, b) => b - a));
    for (const page of pages)
      expect(Object.keys(page).sort()).toEqual(['haySiguiente', 'items', 'pagina']);
  });

  it('una página posterior a la última viene vacía y sin siguiente (RF-25)', async () => {
    await causaOf('Pérez c/ Gómez');

    expect(await list('?pagina=2')).toEqual({ items: [], pagina: 2, haySiguiente: false });
  });
});
