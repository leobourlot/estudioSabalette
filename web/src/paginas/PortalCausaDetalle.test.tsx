import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import { fakePortalService, testCausaPortalDetalle } from '../pruebas/portal-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { CausaPortalDetalle, PortalService } from '../servicios/portal';

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
