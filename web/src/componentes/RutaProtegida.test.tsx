import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import type { UsuarioPropio } from '../servicios/sesion';

/** Renderiza la aplicación en `path` con el usuario que devuelve la API (o una promesa pendiente). */
const renderAt = (path: string, fetchOwnUser: () => Promise<UsuarioPropio | null>) =>
  renderApp(path, fakeSessionService({ fetchOwnUser: vi.fn(fetchOwnUser) }));

const heading = (name: string) => screen.findByRole('heading', { name });

describe('RutaProtegida — orden de decisiones (RF-17, RF-20)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. mientras se carga la sesión, muestra un indicador de carga', () => {
    renderAt('/panel', () => new Promise(() => {}));

    expect(screen.getByRole('status').textContent).toBe('Cargando…');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('2. sin sesión, lleva a /ingresar', async () => {
    renderAt('/panel/usuarios', async () => null);

    expect(await heading('Ingresar')).toBeTruthy();
  });

  it('3. con el cambio de contraseña pendiente, lleva a cambiarla', async () => {
    renderAt('/panel/usuarios', async () => testUser('abogado', { debeCambiarContrasena: true }));

    expect(await heading('Cambiar contraseña')).toBeTruthy();
  });

  it('4. un cliente en el panel va a su portal', async () => {
    renderAt('/panel/usuarios', async () => testUser('cliente'));

    expect(await heading('Mis causas')).toBeTruthy();
  });

  it('4. un integrante en el portal va a su panel', async () => {
    renderAt('/portal', async () => testUser('abogado'));

    expect(await heading('Panel')).toBeTruthy();
  });

  it('5. si todo está bien, muestra la página pedida', async () => {
    renderAt('/panel/usuarios', async () => testUser('admin'));

    expect(await heading('Cuentas')).toBeTruthy();
  });

  it('con sesión, /ingresar lleva al inicio de su sección', async () => {
    renderAt('/ingresar', async () => testUser('cliente'));

    expect(await heading('Mis causas')).toBeTruthy();
  });

  it('si la sesión se cierra mientras navega, lleva a /ingresar', async () => {
    const { closeSession } = renderAt('/panel', async () => testUser('abogado'));
    expect(await heading('Panel')).toBeTruthy();

    closeSession();

    expect(await heading('Ingresar')).toBeTruthy();
  });

  describe('direcciones inexistentes del panel y del portal (spec 007, RF-10)', () => {
    it.each(['/panel/no-existe', '/portal/no-existe', '/panel/causas/5/otra/cosa'])(
      'sin sesión, %s lleva a /ingresar',
      async (path) => {
        renderAt(path, async () => null);

        expect(await heading('Ingresar')).toBeTruthy();
      },
    );

    it('con sesión de integrante, /panel/no-existe lleva al inicio del panel', async () => {
      renderAt('/panel/no-existe', async () => testUser('abogado'));

      expect(await heading('Panel')).toBeTruthy();
    });

    it('con sesión de cliente, /portal/no-existe lleva al inicio del portal', async () => {
      renderAt('/portal/no-existe', async () => testUser('cliente'));

      expect(await heading('Mis causas')).toBeTruthy();
    });

    it('un cliente en /panel/no-existe va a su portal', async () => {
      renderAt('/panel/no-existe', async () => testUser('cliente'));

      expect(await heading('Mis causas')).toBeTruthy();
    });

    it('un integrante en /portal/no-existe va a su panel', async () => {
      renderAt('/portal/no-existe', async () => testUser('admin'));

      expect(await heading('Panel')).toBeTruthy();
    });

    it('con el cambio de contraseña pendiente, lleva a cambiarla', async () => {
      renderAt('/portal/no-existe', async () =>
        testUser('cliente', { debeCambiarContrasena: true }),
      );

      expect(await heading('Cambiar contraseña')).toBeTruthy();
    });

    it('las direcciones existentes siguen funcionando', async () => {
      renderAt('/panel/usuarios', async () => testUser('admin'));

      expect(await heading('Cuentas')).toBeTruthy();
    });
  });

  it('el sitio público no es parte de la aplicación: "/" no tiene página acá (spec 007)', async () => {
    renderAt('/', async () => null);

    await Promise.resolve();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('ProveedorSesion — sin almacenamiento local (RNF de seguridad, principio 5)', () => {
  it('no escribe nada en localStorage ni en sessionStorage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { closeSession } = renderAt('/panel', async () => testUser('admin'));
    expect(await heading('Panel')).toBeTruthy();
    closeSession();
    expect(await heading('Ingresar')).toBeTruthy();

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
