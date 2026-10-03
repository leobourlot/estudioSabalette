import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import { ProveedorSesion } from '../componentes/ProveedorSesion';
import { RutasAplicacion } from '../RutasAplicacion';
import type { Rol, SessionService, UsuarioPropio } from '../servicios/sesion';
import type { UsersService, UsuarioDetalle } from '../servicios/usuarios';

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

/** Cuenta de prueba con auditoría, como la devuelve la gestión de cuentas. */
export function testAccount(overrides: Partial<UsuarioDetalle> = {}): UsuarioDetalle {
  return {
    ...testUser('abogado'),
    activo: true,
    ultimoIngreso: null,
    creadoEn: '2026-09-01T15:00:00.000Z',
    modificadoEn: null,
    creadoPor: null,
    modificadoPor: null,
    ...overrides,
  };
}

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> } & T;

export type FakeSessionService = Mocked<SessionService>;
export type FakeUsersService = Mocked<UsersService>;

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

/** Servicio de usuarios simulado; por defecto, un listado vacío. */
export function fakeUsersService(overrides: Partial<UsersService> = {}): FakeUsersService {
  return {
    listUsers: vi.fn().mockResolvedValue({ items: [], total: 0, pagina: 1, porPagina: 20 }),
    getUser: vi.fn(async (id: number) => testAccount({ id })),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deactivateUser: vi.fn().mockResolvedValue(undefined),
    reactivateUser: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    releaseEmail: vi.fn().mockResolvedValue(undefined),
    transferPrincipal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as FakeUsersService;
}

/**
 * Renderiza la aplicación completa (proveedor de sesión + rutas) en `path`, con servicios
 * simulados. `closeSession` simula el aviso de sesión cerrada del cliente HTTP.
 */
export function renderApp(
  path: string,
  service: SessionService = fakeSessionService(),
  services: { users?: UsersService } = {},
) {
  const listeners = new Set<() => void>();
  const subscribeSessionClosed = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <ProveedorServicios services={{ users: services.users ?? fakeUsersService() }}>
        <ProveedorSesion service={service} subscribeSessionClosed={subscribeSessionClosed}>
          <RutasAplicacion />
        </ProveedorSesion>
      </ProveedorServicios>
    </MemoryRouter>,
  );
  return {
    ...result,
    service,
    closeSession: () => act(() => listeners.forEach((listener) => listener())),
  };
}
