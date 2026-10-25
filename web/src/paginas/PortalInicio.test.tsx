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
  return screen.findByRole('heading', { name: 'Mis causas', level: 2 });
}

const listWith = (items: CausaPortalResumen[], haySiguiente = false) =>
  fakePortalService({
    listCausas: vi.fn(async (pagina: number) => testPortalPage(items, pagina, haySiguiente)),
  });

describe('PortalInicio: lista de causas (spec 004, RF-7 a RF-12, RF-24, RF-25)', () => {
  it('saluda al cliente como título principal y debajo va "Mis causas" (spec 008, RF-28)', async () => {
    await openPortal('/portal', listWith([]));

    const [title, subtitle] = within(screen.getByRole('main')).getAllByRole('heading');
    expect([title.tagName, title.textContent]).toEqual(['H1', 'Hola, Ana.']);
    expect([subtitle.tagName, subtitle.textContent]).toEqual(['H2', 'Mis causas']);
  });

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
    // Cada causa en su tarjeta (spec 008, RF-15), con "Ver detalle" que suma la carátula.
    const firstLink = within(enCurso).getByRole('link', { name: 'Ver detalle de Pérez c/ Gómez' });
    expect(firstLink.getAttribute('href')).toBe('/portal/causas/1');
    const first = within(firstLink.closest('article')!);
    expect(first.getByRole('heading', { name: 'Pérez c/ Gómez', level: 3 })).toBeTruthy();
    expect(first.getByText('Expte. 1234/2024')).toBeTruthy();
    expect(first.getByText('Paralizada')).toBeTruthy();
    expect(first.getByText('Último movimiento')).toBeTruthy();
    expect(first.getByText('30/09/2026')).toBeTruthy();
    const secondLink = within(archivadas).getByRole('link', {
      name: 'Ver detalle de Ruiz c/ Díaz',
    });
    const second = within(secondLink.closest('article')!);
    expect(second.getByText('Expte. Sin asignar')).toBeTruthy();
    expect(second.queryByText(/Último movimiento/)).toBeNull();
    expect(portal.listCausas).toHaveBeenCalledWith(1);
  });

  it('separa cada grupo con una línea bajo su título y cada causa en su tarjeta con borde (spec 008, RF-15, RF-16)', async () => {
    await openPortal('/portal', listWith([testCausaPortal({ id: 1 }), testCausaPortal({ id: 2 })]));

    const enCurso = await screen.findByRole('region', { name: 'En curso' });
    const title = within(enCurso).getByRole('heading', { level: 2 });
    expect(title.className).toContain('border-b');
    const cards = within(enCurso).getAllByRole('article');
    expect(cards).toHaveLength(2);
    for (const card of cards) expect(card.className).toContain('border');
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
