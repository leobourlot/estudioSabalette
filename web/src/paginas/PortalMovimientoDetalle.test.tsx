import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import { fakePortalService, testMovimientoClienteDetalle } from '../pruebas/portal-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { PortalService } from '../servicios/portal';

function openMovement(path: string, portal: PortalService) {
  const session = fakeSessionService({
    fetchOwnUser: vi.fn().mockResolvedValue(testUser('cliente')),
  });
  renderApp(path, session, { portal });
}

describe('PortalMovimientoDetalle (spec 004, RF-22, RF-29)', () => {
  it('muestra el movimiento con el texto completo y la carátula de su causa', async () => {
    const long = `${'a'.repeat(400)}FIN`;
    const portal = fakePortalService({
      getMovimiento: vi.fn(async () =>
        testMovimientoClienteDetalle({ texto: long, tipo: 'sentencia', fecha: '2026-09-30' }),
      ),
    });
    openMovement('/portal/causas/7/movimientos/70?pagina=3', portal);

    expect(await screen.findByText(long)).toBeTruthy();
    expect(screen.getByText('Gómez c/ López s/ daños')).toBeTruthy();
    expect(screen.getByText('30/09/2026')).toBeTruthy();
    expect(screen.getByText('Sentencia')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull();
    expect(portal.getMovimiento).toHaveBeenCalledWith('7', '70');
  });

  it('muestra la leyenda del movimiento', async () => {
    openMovement(
      '/portal/causas/7/movimientos/70',
      fakePortalService({
        getMovimiento: vi.fn(async () => testMovimientoClienteDetalle({ anulado: true })),
      }),
    );

    expect(await screen.findByText('Anulado')).toBeTruthy();
  });

  it('"Volver a la causa" lleva a la misma página de movimientos', async () => {
    openMovement('/portal/causas/7/movimientos/70?pagina=3', fakePortalService());

    const back = await screen.findByRole('link', { name: 'Volver a la causa' });
    expect(back.getAttribute('href')).toBe('/portal/causas/7?pagina=3');
  });

  it('sin página válida, "Volver a la causa" lleva a la primera', async () => {
    openMovement('/portal/causas/7/movimientos/70?pagina=abc', fakePortalService());

    const back = await screen.findByRole('link', { name: 'Volver a la causa' });
    expect(back.getAttribute('href')).toBe('/portal/causas/7?pagina=1');
  });

  it('ante un 404, muestra solo el mensaje de la API', async () => {
    const portal = fakePortalService({
      getMovimiento: vi.fn().mockRejectedValue(new ApiError(404, ['No existe ese movimiento'])),
    });
    openMovement('/portal/causas/7/movimientos/abc', portal);

    expect(await screen.findByText('No existe ese movimiento')).toBeTruthy();
    expect(screen.queryByText('Gómez c/ López s/ daños')).toBeNull();
    expect(portal.getMovimiento).toHaveBeenCalledWith('7', 'abc');
  });
});
