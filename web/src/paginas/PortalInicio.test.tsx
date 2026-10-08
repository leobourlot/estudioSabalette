import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import { fakePortalService, testCausaPortal, testPortalPage } from '../pruebas/portal-de-prueba';
import type { CausaPortalResumen, PortalService } from '../servicios/portal';

function openPortal(path: string, portal: PortalService) {
  const session = fakeSessionService({
    fetchOwnUser: vi.fn().mockResolvedValue(testUser('cliente')),
  });
  renderApp(path, session, { portal });
  return screen.findByRole('heading', { name: 'Mis causas', level: 1 });
}

const listWith = (items: CausaPortalResumen[], haySiguiente = false) =>
  fakePortalService({
    listCausas: vi.fn(async (pagina: number) => testPortalPage(items, pagina, haySiguiente)),
  });

describe('PortalInicio: lista de causas (spec 004, RF-7 a RF-12, RF-24, RF-25)', () => {
  it('muestra los grupos con su título y cada causa con sus datos', async () => {
    const portal = listWith([
      testCausaPortal({ id: 1, caratula: 'Pérez c/ Gómez', estado: 'paralizada' }),
      testCausaPortal({
        id: 2,
        caratula: 'Ruiz c/ Díaz',
        numeroExpediente: null,
        estado: 'archivada',
        grupo: 'archivadas_y_finalizadas',
        fechaUltimoMovimiento: null,
      }),
    ]);

    await openPortal('/portal', portal);

    const enCurso = await screen.findByRole('region', { name: 'En curso' });
    const archivadas = screen.getByRole('region', { name: 'Archivadas y finalizadas' });
    const first = within(enCurso).getByRole('link', { name: /Pérez c\/ Gómez/ });
    expect(first.getAttribute('href')).toBe('/portal/causas/1');
    expect(within(first).getByText('Expediente: 1234/2024')).toBeTruthy();
    expect(within(first).getByText('Paralizada')).toBeTruthy();
    expect(within(first).getByText('Último movimiento: 30/09/2026')).toBeTruthy();
    const second = within(archivadas).getByRole('link', { name: /Ruiz c\/ Díaz/ });
    expect(within(second).getByText('Expediente: Sin asignar')).toBeTruthy();
    expect(within(second).queryByText(/Último movimiento/)).toBeNull();
    expect(portal.listCausas).toHaveBeenCalledWith(1);
  });

  it('corta la carátula en dos líneas', async () => {
    await openPortal('/portal', listWith([testCausaPortal({ caratula: 'Carátula larga' })]));

    expect((await screen.findByText('Carátula larga')).className).toContain('line-clamp-2');
  });

  it('en la página 1 sin causas muestra "No tenés causas para consultar" (RF-12)', async () => {
    await openPortal('/portal', listWith([]));

    expect(await screen.findByText('No tenés causas para consultar')).toBeTruthy();
  });

  it('en una página posterior a la última no muestra nada (RF-25)', async () => {
    const portal = listWith([]);
    await openPortal('/portal?pagina=4', portal);

    expect(portal.listCausas).toHaveBeenCalledWith(4);
    await vi.waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.queryByText('No tenés causas para consultar')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).toBeNull();
  });

  it('con una página inválida en la dirección no pide nada ni muestra mensajes (RF-25)', async () => {
    const portal = listWith([testCausaPortal()]);
    await openPortal('/portal?pagina=abc', portal);

    expect(portal.listCausas).not.toHaveBeenCalled();
    expect(screen.queryByText('No tenés causas para consultar')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('pagina con "Anterior" y "Siguiente", sin totales (RF-24)', async () => {
    await openPortal('/portal?pagina=2', listWith([testCausaPortal()], true));

    const pagination = await screen.findByRole('navigation', { name: 'Paginación' });
    expect(within(pagination).getByRole('link', { name: 'Anterior' }).getAttribute('href')).toBe(
      '/portal?pagina=1',
    );
    expect(within(pagination).getByRole('link', { name: 'Siguiente' }).getAttribute('href')).toBe(
      '/portal?pagina=3',
    );
    expect(pagination.textContent).not.toMatch(/\d/);
  });

  it('en la primera página no ofrece "Anterior", y sin siguiente no ofrece "Siguiente"', async () => {
    await openPortal('/portal', listWith([testCausaPortal()], false));

    await screen.findByRole('link', { name: /Gómez c\/ López/ });
    expect(screen.queryByRole('link', { name: 'Anterior' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Siguiente' })).toBeNull();
  });

  it('si la API falla, muestra el error', async () => {
    const portal = fakePortalService({
      listCausas: vi.fn().mockRejectedValue(new Error('caída')),
    });
    await openPortal('/portal', portal);

    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
