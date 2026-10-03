import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ProveedorSesion } from '../componentes/ProveedorSesion';
import { RutasAplicacion } from '../RutasAplicacion';
import type { Rol, SessionService, UsuarioPropio } from '../servicios/sesion';

/** Usuario de prueba con el rol indicado. */
export function testUser(rol: Rol, overrides: Partial<UsuarioPropio> = {}): UsuarioPropio {
  return {
    id: 1,
    rol,
    esPrincipal: false,
    email: 'usuario@estudio.com',
    nombre: 'Ana',
    apellido: 'Gómez',
    debeCambiarContrasena: false,
    cliente: null,
    ...overrides,
  };
}

export type FakeSessionService = {
  [K in keyof SessionService]: ReturnType<typeof vi.fn>;
} & SessionService;

/** Servicio de sesión simulado; por defecto, sin sesión. */
export function fakeSessionService(overrides: Partial<SessionService> = {}): FakeSessionService {
  return {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    fetchOwnUser: vi.fn().mockResolvedValue(null),
    changePassword: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as FakeSessionService;
}

/**
 * Renderiza la aplicación completa (proveedor de sesión + rutas) en `path`, con un servicio
 * de sesión simulado. `closeSession` simula el aviso de sesión cerrada del cliente HTTP.
 */
export function renderApp(path: string, service: SessionService = fakeSessionService()) {
  const listeners = new Set<() => void>();
  const subscribeSessionClosed = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <ProveedorSesion service={service} subscribeSessionClosed={subscribeSessionClosed}>
        <RutasAplicacion />
      </ProveedorSesion>
    </MemoryRouter>,
  );
  return {
    ...result,
    service,
    closeSession: () => act(() => listeners.forEach((listener) => listener())),
  };
}
