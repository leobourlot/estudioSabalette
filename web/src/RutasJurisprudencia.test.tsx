import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, testUser } from './pruebas/aplicacion-de-prueba';
import { fakeJurisprudenciaService, renderRulingsApp } from './pruebas/jurisprudencia-de-prueba';
import type { UsuarioPropio } from './servicios/sesion';

const sessionFor = (usuario: UsuarioPropio) =>
  fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(usuario) });

const ROUTES: [string, string][] = [
  ['/panel/jurisprudencia', 'Jurisprudencia'],
  ['/panel/jurisprudencia/nuevo', 'Nuevo fallo'],
  ['/panel/jurisprudencia/5', 'Fallo'],
];

/** Rutas de la jurisprudencia (plan 005, "Rutas"). El control real lo hace la API (RF-34). */
describe('rutas de jurisprudencia', () => {
  describe.each(ROUTES)('%s', (path, heading) => {
    it.each(['abogado', 'admin'] as const)('un integrante con rol %s entra', async (rol) => {
      renderRulingsApp(path, sessionFor(testUser(rol)));

      expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeTruthy();
    });

    it('un cliente que entra es llevado al portal, sin pedir nada de jurisprudencia (RF-34, RF-36)', async () => {
      const jurisprudencia = fakeJurisprudenciaService();
      renderRulingsApp(path, sessionFor(testUser('cliente')), jurisprudencia);

      expect(await screen.findByRole('heading', { name: 'Mis causas' })).toBeTruthy();
      for (const call of Object.values(jurisprudencia)) expect(call).not.toHaveBeenCalled();
    });

    it('sin sesión lleva a ingresar, sin pedir nada de jurisprudencia', async () => {
      const jurisprudencia = fakeJurisprudenciaService();
      renderRulingsApp(path, fakeSessionService(), jurisprudencia);

      expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
      for (const call of Object.values(jurisprudencia)) expect(call).not.toHaveBeenCalled();
    });

    it('un integrante con cambio de contraseña pendiente va a cambiarla (RF-34)', async () => {
      const jurisprudencia = fakeJurisprudenciaService();
      renderRulingsApp(
        path,
        sessionFor(testUser('abogado', { debeCambiarContrasena: true })),
        jurisprudencia,
      );

      expect(await screen.findByRole('heading', { name: 'Cambiar contraseña' })).toBeTruthy();
      for (const call of Object.values(jurisprudencia)) expect(call).not.toHaveBeenCalled();
    });
  });
});
