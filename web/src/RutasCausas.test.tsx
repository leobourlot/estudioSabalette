import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from './pruebas/aplicacion-de-prueba';
import type { UsuarioPropio } from './servicios/sesion';

const sessionFor = (usuario: UsuarioPropio) =>
  fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(usuario) });

/** Rutas de causas del panel (plan 002, "Rutas"). El control real lo hace la API (RF-44). */
describe('rutas de causas', () => {
  it.each([
    ['/panel/causas', 'Causas'],
    ['/panel/causas/nueva', 'Nueva causa'],
    ['/panel/causas/7', 'Causa'],
  ])('un integrante del estudio entra a %s', async (path, heading) => {
    renderApp(path, sessionFor(testUser('abogado')));

    expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeTruthy();
  });

  it.each(['/panel/causas', '/panel/causas/nueva', '/panel/causas/7'])(
    'un cliente que entra a %s es llevado al portal (RF-44)',
    async (path) => {
      renderApp(path, sessionFor(testUser('cliente')));

      expect(await screen.findByRole('heading', { name: 'Mis causas' })).toBeTruthy();
    },
  );

  it('sin sesión lleva a ingresar', async () => {
    renderApp('/panel/causas');

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
  });

  it('el enlace "Causas" del panel lleva al listado', async () => {
    renderApp('/panel', sessionFor(testUser('admin')));
    await screen.findByRole('heading', { name: 'Panel' });

    await userEvent.setup().click(screen.getByRole('link', { name: 'Causas' }));

    expect(await screen.findByRole('heading', { name: 'Causas', level: 1 })).toBeTruthy();
  });
});
