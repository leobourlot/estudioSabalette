import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import {
  fakePortalService,
  testCausaPortalDetalle,
  testMovimientoCliente,
  testPortalPage,
} from '../pruebas/portal-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { CausaPortalDetalle, MovimientoCliente, PortalService } from '../servicios/portal';

function openCausa(path: string, portal: PortalService) {
  const session = fakeSessionService({
    fetchOwnUser: vi.fn().mockResolvedValue(testUser('cliente')),
  });
  renderApp(path, session, { portal });
}

const withCausa = (overrides: Partial<CausaPortalDetalle> = {}) =>
  fakePortalService({ getCausa: vi.fn(async () => testCausaPortalDetalle(overrides)) });

describe('PortalCausaDetalle: datos, partes y responsable (spec 004, RF-13 a RF-17, RF-28)', () => {
  it('muestra la carátula completa y los datos de la causa', async () => {
    const portal = withCausa({ estado: 'paralizada' });
    openCausa('/portal/causas/7', portal);

    expect(
      await screen.findByRole('heading', { name: 'Gómez c/ López s/ daños', level: 1 }),
    ).toBeTruthy();
    const datos = within(screen.getByRole('region', { name: 'Datos de la causa' }));
    expect(datos.getByText('1234/2024')).toBeTruthy();
    expect(datos.getByText('Juzgado Civil Nº 3')).toBeTruthy();
    expect(datos.getByText('Civil')).toBeTruthy();
    expect(datos.getByText('Paralizada')).toBeTruthy();
    expect(portal.getCausa).toHaveBeenCalledWith('7');
  });

  it('muestra "Sin asignar" en el número y el juzgado no informados', async () => {
    openCausa('/portal/causas/7', withCausa({ numeroExpediente: null, juzgado: null }));

    await screen.findByRole('heading', { level: 1 });
    const datos = within(screen.getByRole('region', { name: 'Datos de la causa' }));
    expect(datos.getAllByText('Sin asignar')).toHaveLength(2);
  });

  it('de un incidente, muestra la leyenda del expediente principal', async () => {
    openCausa(
      '/portal/causas/7',
      withCausa({ esIncidente: true, expedientePrincipal: '999/2023' }),
    );

    expect(await screen.findByText('Vinculado al expte. principal Nº 999/2023')).toBeTruthy();
  });

  it('muestra las partes con su rol, y "Vos" solo en la del cliente', async () => {
    openCausa('/portal/causas/7', withCausa());

    const partes = within(await screen.findByRole('region', { name: 'Partes' }));
    const items = partes.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Ana GómezActorVos',
      'Pedro LópezDemandado',
    ]);
  });

  it('muestra el responsable de la causa', async () => {
    openCausa('/portal/causas/7', withCausa());

    expect(await screen.findByText('Responsable de la causa: Luis Sosa')).toBeTruthy();
  });

  it('sin responsable activo, no muestra ningún abogado ni aviso (RF-16)', async () => {
    openCausa('/portal/causas/7', withCausa({ responsable: null }));

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText(/Responsable/)).toBeNull();
  });

  it('ante un 404, muestra solo el mensaje de la API (RF-28)', async () => {
    const portal = fakePortalService({
      getCausa: vi.fn().mockRejectedValue(new ApiError(404, ['No existe esa causa'])),
      listMovimientos: vi.fn().mockRejectedValue(new ApiError(404, ['No existe esa causa'])),
    });
    openCausa('/portal/causas/abc', portal);

    expect(await screen.findByText('No existe esa causa')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Datos de la causa' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Partes' })).toBeNull();
    expect(portal.getCausa).toHaveBeenCalledWith('abc');
  });
});

describe('PortalCausaDetalle: movimientos (spec 004, RF-20, RF-21, RF-23, RF-24)', () => {
  const withMovements = (items: MovimientoCliente[], haySiguiente = false) =>
    fakePortalService({
      listMovimientos: vi.fn(async (_causaId: string | number, pagina: number) =>
        testPortalPage(items, pagina, haySiguiente),
      ),
    });

  const movements = async () => within(await screen.findByRole('region', { name: 'Movimientos' }));

  it('muestra la fecha, el tipo y el texto de cada movimiento, en el orden recibido', async () => {
    const portal = withMovements([
      testMovimientoCliente({ id: 1, fecha: '2026-09-30', tipo: 'audiencia', texto: 'Primero.' }),
      testMovimientoCliente({ id: 2, fecha: '2026-08-01', tipo: 'sentencia', texto: 'Segundo.' }),
    ]);
    openCausa('/portal/causas/7', portal);

    const list = await movements();
    const items = await list.findAllByRole('article');
    expect(items.map((item) => within(item).getByText(/\d{2}\/\d{2}\/\d{4}/).textContent)).toEqual([
      '30/09/2026',
      '01/08/2026',
    ]);
    expect(within(items[0]).getByText('Audiencia')).toBeTruthy();
    expect(within(items[0]).getByText('Primero.')).toBeTruthy();
    expect(within(items[1]).getByText('Sentencia')).toBeTruthy();
    expect(portal.listMovimientos).toHaveBeenCalledWith('7', 1);
  });

  it('muestra "Anulado" o "Fecha futura", y en un anulado futuro solo "Anulado" (RF-21)', async () => {
    openCausa(
      '/portal/causas/7',
      withMovements([
        testMovimientoCliente({ id: 1, esFechaFutura: true }),
        testMovimientoCliente({ id: 2, anulado: true }),
        testMovimientoCliente({ id: 3, anulado: true, esFechaFutura: false }),
      ]),
    );

    const items = await (await movements()).findAllByRole('article');
    expect(within(items[0]).getByText('Fecha futura')).toBeTruthy();
    expect(within(items[1]).getByText('Anulado')).toBeTruthy();
    expect(within(items[1]).queryByText('Fecha futura')).toBeNull();
    expect(within(items[2]).getByText('Anulado')).toBeTruthy();
  });

  it('recorta un texto largo y "Ver más" lo despliega sin otra petición (RF-21)', async () => {
    const long = `${'a'.repeat(300)}FIN`;
    const portal = withMovements([testMovimientoCliente({ texto: long })]);
    openCausa('/portal/causas/7', portal);

    const item = (await (await movements()).findAllByRole('article'))[0];
    expect(within(item).getByText(`${'a'.repeat(300)}…`)).toBeTruthy();

    await userEvent.setup().click(within(item).getByRole('button', { name: 'Ver más' }));

    expect(within(item).getByText(long)).toBeTruthy();
    expect(portal.listMovimientos).toHaveBeenCalledTimes(1);
  });

  it('un texto corto no ofrece "Ver más"', async () => {
    openCausa('/portal/causas/7', withMovements([testMovimientoCliente({ texto: 'Corto.' })]));

    const item = (await (await movements()).findAllByRole('article'))[0];
    expect(within(item).queryByRole('button', { name: 'Ver más' })).toBeNull();
  });

  it('el enlace "Abrir" lleva al movimiento con la página actual (RF-22)', async () => {
    openCausa('/portal/causas/7?pagina=3', withMovements([testMovimientoCliente({ id: 70 })]));

    const item = (await (await movements()).findAllByRole('article'))[0];
    expect(within(item).getByRole('link', { name: 'Abrir' }).getAttribute('href')).toBe(
      '/portal/causas/7/movimientos/70?pagina=3',
    );
  });

  it('en la página 1 sin movimientos muestra "Todavía no hay movimientos para mostrar" (RF-23)', async () => {
    openCausa('/portal/causas/7', withMovements([]));

    expect(
      await (await movements()).findByText('Todavía no hay movimientos para mostrar'),
    ).toBeTruthy();
  });

  it('pagina sin totales, con la página en la dirección (RF-24)', async () => {
    openCausa('/portal/causas/7?pagina=2', withMovements([testMovimientoCliente()], true));

    const pagination = await (await movements()).findByRole('navigation', { name: 'Paginación' });
    expect(within(pagination).getByRole('link', { name: 'Anterior' }).getAttribute('href')).toBe(
      '/portal/causas/7?pagina=1',
    );
    expect(within(pagination).getByRole('link', { name: 'Siguiente' }).getAttribute('href')).toBe(
      '/portal/causas/7?pagina=3',
    );
  });

  it('con una página inválida no pide movimientos ni muestra el mensaje de vacío (RF-25)', async () => {
    const portal = withMovements([]);
    openCausa('/portal/causas/7?pagina=abc', portal);

    await screen.findByRole('heading', { level: 1 });
    expect(portal.listMovimientos).not.toHaveBeenCalled();
    expect(screen.queryByText('Todavía no hay movimientos para mostrar')).toBeNull();
  });
});
