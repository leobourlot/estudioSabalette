import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from './pruebas/aplicacion-de-prueba';
import type { UsuarioPropio } from './servicios/sesion';

const sessionFor = (usuario: UsuarioPropio) =>
  fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(usuario) });

const PATH = '/panel/causas/7/movimientos/12';

/** Ruta del detalle de un movimiento (plan 003, "Rutas"). El control real lo hace la API (RF-35). */
describe('ruta del detalle de un movimiento', () => {
  it.each(['abogado', 'admin'] as const)(
    'un integrante con rol %s entra al detalle',
    async (rol) => {
      renderApp(PATH, sessionFor(testUser(rol)));

      expect(await screen.findByRole('heading', { name: 'Movimiento', level: 1 })).toBeTruthy();
    },
  );

  it('un cliente que entra es llevado al portal (RF-35)', async () => {
    renderApp(PATH, sessionFor(testUser('cliente')));

    expect(await screen.findByRole('heading', { name: 'Mis causas' })).toBeTruthy();
  });

  it('sin sesión lleva a ingresar', async () => {
    renderApp(PATH);

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
  });
});
