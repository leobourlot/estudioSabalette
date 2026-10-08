import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import {
  fakePortalService,
  testCausaPortal,
  testMovimientoCliente,
  testPortalPage,
} from '../pruebas/portal-de-prueba';
import type { UsuarioPropio } from '../servicios/sesion';

const PORTAL_ROUTES = [
  '/portal?pagina=2',
  '/portal/causas/7',
  '/portal/causas/7/movimientos/70?pagina=2',
];

const renderAs = (path: string, usuario: UsuarioPropio | null) =>
  renderApp(path, fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(usuario) }), {
    portal: fakePortalService(),
  });

describe('Portal: acceso a las rutas nuevas (spec 004, RF-1)', () => {
  it.each(PORTAL_ROUTES)('un visitante en %s va a la pantalla de ingreso', async (path) => {
    renderAs(path, null);

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
  });

  it.each(PORTAL_ROUTES.flatMap((path) => [[path, 'admin'] as const, [path, 'abogado'] as const]))(
    'en %s, un %s va al panel',
    async (path, rol) => {
      renderAs(path, testUser(rol));

      expect(await screen.findByRole('heading', { name: 'Panel' })).toBeTruthy();
    },
  );

  it.each(PORTAL_ROUTES)(
    'un cliente con el cambio de contraseña pendiente en %s va a cambiarla',
    async (path) => {
      renderAs(path, testUser('cliente', { debeCambiarContrasena: true }));

      expect(await screen.findByRole('heading', { name: 'Cambiar contraseña' })).toBeTruthy();
    },
  );
});

describe('Portal: nada se guarda en el navegador (principio 5)', () => {
  const storage = { local: 0, session: 0 };

  beforeEach(() => {
    storage.local = 0;
    storage.session = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage) {
      if (this === window.localStorage) storage.local += 1;
      else storage.session += 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('recorrer la lista, una causa, un movimiento y volver no escribe en localStorage ni sessionStorage', async () => {
    const portal = fakePortalService({
      listCausas: vi.fn(async (pagina: number) => testPortalPage([testCausaPortal()], pagina)),
      listMovimientos: vi.fn(async (_causaId: string | number, pagina: number) =>
        testPortalPage([testMovimientoCliente()], pagina, true),
      ),
    });
    renderApp(
      '/portal',
      fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser('cliente')) }),
      {
        portal,
      },
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole('link', { name: /Gómez c\/ López/ }));
    await user.click(await screen.findByRole('link', { name: 'Siguiente' }));
    await user.click(await screen.findByRole('link', { name: 'Abrir' }));
    await user.click(await screen.findByRole('link', { name: 'Volver a la causa' }));
    await screen.findByRole('link', { name: 'Anterior' });

    expect(portal.listMovimientos).toHaveBeenLastCalledWith('7', 2);
    expect(storage).toEqual({ local: 0, session: 0 });
  });
});
