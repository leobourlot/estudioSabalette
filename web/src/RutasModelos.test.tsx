import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, testUser } from './pruebas/aplicacion-de-prueba';
import { fakeModelosService, renderModelsApp } from './pruebas/modelos-de-prueba';
import type { UsuarioPropio } from './servicios/sesion';

const sessionFor = (usuario: UsuarioPropio) =>
  fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(usuario) });

const ROUTES: [string, string][] = [
  ['/panel/modelos', 'Modelos'],
  ['/panel/modelos/nuevo', 'Nuevo modelo'],
  ['/panel/modelos/8', 'Modelo'],
  ['/panel/causas/5/modelos', 'Completar un modelo'],
  ['/panel/causas/5/modelos/8', 'Escrito'],
];

/** Rutas de los modelos de escritos (plan 006, "Rutas"). El control real lo hace la API (RF-50). */
describe('rutas de modelos de escritos', () => {
  describe.each(ROUTES)('%s', (path, heading) => {
    it.each(['abogado', 'admin'] as const)('un integrante con rol %s entra', async (rol) => {
      renderModelsApp(path, { session: sessionFor(testUser(rol)) });

      expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeTruthy();
    });

    it('un cliente que entra es llevado al portal, sin pedir nada de modelos (RF-50, RF-52)', async () => {
      const modelos = fakeModelosService();
      renderModelsApp(path, { session: sessionFor(testUser('cliente')), modelos });

      expect(await screen.findByRole('heading', { name: 'Mis causas' })).toBeTruthy();
      for (const call of Object.values(modelos)) expect(call).not.toHaveBeenCalled();
    });

    it('sin sesión lleva a ingresar, sin pedir nada de modelos', async () => {
      const modelos = fakeModelosService();
      renderModelsApp(path, { session: fakeSessionService(), modelos });

      expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
      for (const call of Object.values(modelos)) expect(call).not.toHaveBeenCalled();
    });

    it('un integrante con cambio de contraseña pendiente va a cambiarla (RF-50)', async () => {
      const modelos = fakeModelosService();
      renderModelsApp(path, {
        session: sessionFor(testUser('abogado', { debeCambiarContrasena: true })),
        modelos,
      });

      expect(await screen.findByRole('heading', { name: 'Cambiar contraseña' })).toBeTruthy();
      for (const call of Object.values(modelos)) expect(call).not.toHaveBeenCalled();
    });
  });

  it('el panel tiene el enlace "Modelos", que lleva a la sección', async () => {
    renderModelsApp('/panel/modelos', { session: sessionFor(testUser('abogado')) });
    await screen.findByRole('heading', { name: 'Modelos', level: 1 });

    const link = within(screen.getByRole('navigation')).getByRole('link', { name: 'Modelos' });

    expect(link.getAttribute('href')).toBe('/panel/modelos');
  });

  it('el portal de un cliente no tiene ningún enlace a los modelos (RF-52)', async () => {
    renderModelsApp('/portal', { session: sessionFor(testUser('cliente')) });
    await screen.findByRole('heading', { name: 'Mis causas' });

    expect(screen.queryByRole('link', { name: /modelo/i })).toBeNull();
  });
});
