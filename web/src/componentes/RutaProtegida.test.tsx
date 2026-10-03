import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RutasAplicacion } from '../RutasAplicacion';
import type { Rol, SessionService, UsuarioPropio } from '../servicios/sesion';
import { ProveedorSesion } from './ProveedorSesion';

function user(rol: Rol, debeCambiarContrasena = false): UsuarioPropio {
  return {
    id: 1,
    rol,
    esPrincipal: false,
    email: 'usuario@estudio.com',
    nombre: 'Ana',
    apellido: 'Gómez',
    debeCambiarContrasena,
    cliente: null,
  };
}

function fakeService(fetchOwnUser: () => Promise<UsuarioPropio | null>): SessionService {
  return {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    fetchOwnUser: vi.fn(fetchOwnUser),
    changePassword: vi.fn(),
  };
}

/** Renderiza la aplicación en `path` con el usuario que devuelve la API (o una promesa pendiente). */
function renderAt(path: string, fetchOwnUser: () => Promise<UsuarioPropio | null>) {
  const listeners = new Set<() => void>();
  const subscribeSessionClosed = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProveedorSesion
        service={fakeService(fetchOwnUser)}
        subscribeSessionClosed={subscribeSessionClosed}
      >
        <RutasAplicacion />
      </ProveedorSesion>
    </MemoryRouter>,
  );
  return { closeSession: () => act(() => listeners.forEach((listener) => listener())) };
}

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
    renderAt('/panel/usuarios', async () => user('abogado', true));

    expect(await heading('Cambiar contraseña')).toBeTruthy();
  });

  it('4. un cliente en el panel va a su portal', async () => {
    renderAt('/panel/usuarios', async () => user('cliente'));

    expect(await heading('Mis causas')).toBeTruthy();
  });

  it('4. un integrante en el portal va a su panel', async () => {
    renderAt('/portal', async () => user('abogado'));

    expect(await heading('Panel')).toBeTruthy();
  });

  it('5. si todo está bien, muestra la página pedida', async () => {
    renderAt('/panel/usuarios', async () => user('admin'));

    expect(await heading('Cuentas')).toBeTruthy();
  });

  it('con sesión, /ingresar lleva al inicio de su sección', async () => {
    renderAt('/ingresar', async () => user('cliente'));

    expect(await heading('Mis causas')).toBeTruthy();
  });

  it('si la sesión se cierra mientras navega, lleva a /ingresar', async () => {
    const { closeSession } = renderAt('/panel', async () => user('abogado'));
    expect(await heading('Panel')).toBeTruthy();

    closeSession();

    expect(await heading('Ingresar')).toBeTruthy();
  });

  it('las páginas públicas se ven sin sesión', async () => {
    renderAt('/', async () => null);

    expect(await heading('Estudio Sabalette')).toBeTruthy();
  });
});

describe('ProveedorSesion — sin almacenamiento local (RNF de seguridad, principio 5)', () => {
  it('no escribe nada en localStorage ni en sessionStorage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { closeSession } = renderAt('/panel', async () => user('admin'));
    expect(await heading('Panel')).toBeTruthy();
    closeSession();
    expect(await heading('Ingresar')).toBeTruthy();

    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
