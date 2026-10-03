import { describe, expect, it, vi } from 'vitest';
import { ApiError, type HttpClient } from './cliente-http';
import {
  canAccess,
  createSessionService,
  resolveLandingRoute,
  type Rol,
  type UsuarioPropio,
} from './sesion';

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

const admin = user('admin');
const lawyer = user('abogado');
const client = user('cliente');

describe('resolveLandingRoute (RF-8, RF-11)', () => {
  it.each([
    ['admin', admin, '/panel'],
    ['abogado', lawyer, '/panel'],
    ['cliente', client, '/portal'],
  ])('lleva al rol %s a su sección', (_rol, usuario, route) => {
    expect(resolveLandingRoute(usuario)).toBe(route);
  });

  it.each([admin, lawyer, client])(
    'con el cambio pendiente, lleva primero a cambiar la contraseña ($rol)',
    (usuario) => {
      expect(resolveLandingRoute({ ...usuario, debeCambiarContrasena: true })).toBe(
        '/cambiar-contrasena',
      );
    },
  );
});

describe('canAccess (RF-8, RF-11, RF-17, RF-20)', () => {
  const allowed = { allowed: true };
  const redirect = (redirectTo: string) => ({ allowed: false, redirectTo });

  describe('sin sesión', () => {
    it.each(['/panel', '/panel/usuarios/7', '/portal', '/portal/mi-cuenta', '/cambiar-contrasena'])(
      'manda %s a /ingresar',
      (path) => {
        expect(canAccess(path, null)).toEqual(redirect('/ingresar'));
      },
    );

    it.each(['/', '/ingresar', '/servicios'])('deja ver la página pública %s', (path) => {
      expect(canAccess(path, null)).toEqual(allowed);
    });
  });

  describe('con sesión', () => {
    it.each([
      ['admin', admin, '/panel/usuarios'],
      ['abogado', lawyer, '/panel/usuarios/nuevo'],
      ['abogado', lawyer, '/panel/mi-cuenta'],
      ['cliente', client, '/portal'],
      ['cliente', client, '/portal/mi-cuenta'],
    ])('deja al rol %s entrar a %s', (_rol, usuario, path) => {
      expect(canAccess(path, usuario)).toEqual(allowed);
    });

    it('lleva a un cliente que entra al panel a su portal (RF-20)', () => {
      expect(canAccess('/panel/usuarios', client)).toEqual(redirect('/portal'));
    });

    it.each([admin, lawyer])(
      'lleva a un integrante que entra al portal a su panel ($rol)',
      (usuario) => {
        expect(canAccess('/portal', usuario)).toEqual(redirect('/panel'));
      },
    );

    it.each([admin, lawyer, client])(
      'desde /ingresar lo lleva al inicio de su sección ($rol)',
      (usuario) => {
        expect(canAccess('/ingresar', usuario)).toEqual(redirect(resolveLandingRoute(usuario)));
      },
    );

    it('permite cambiar la contraseña aunque no sea obligatorio', () => {
      expect(canAccess('/cambiar-contrasena', lawyer)).toEqual(allowed);
    });

    it('deja ver las páginas públicas', () => {
      expect(canAccess('/', client)).toEqual(allowed);
    });
  });

  describe('con el cambio de contraseña pendiente (RF-11)', () => {
    it.each([
      ['admin', '/panel/usuarios'],
      ['abogado', '/panel'],
      ['cliente', '/portal'],
    ] as const)('manda al rol %s de %s a cambiar la contraseña', (rol, path) => {
      expect(canAccess(path, user(rol, true))).toEqual(redirect('/cambiar-contrasena'));
    });

    it('deja entrar a la pantalla de cambio de contraseña', () => {
      expect(canAccess('/cambiar-contrasena', user('cliente', true))).toEqual(allowed);
    });

    it('desde /ingresar lo lleva a cambiar la contraseña', () => {
      expect(canAccess('/ingresar', user('abogado', true))).toEqual(
        redirect('/cambiar-contrasena'),
      );
    });
  });
});

describe('servicio de sesión', () => {
  function fakeClient() {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      onSessionClosed: vi.fn(),
    };
  }

  it('ingresa con email y contraseña', async () => {
    const http = fakeClient();
    http.post.mockResolvedValueOnce(lawyer);

    const result = await createSessionService(http as unknown as HttpClient).login(
      'juan@estudio.com',
      'clave del estudio 2026',
    );

    expect(result).toBe(lawyer);
    expect(http.post).toHaveBeenCalledWith('/sesion/ingresar', {
      email: 'juan@estudio.com',
      contrasena: 'clave del estudio 2026',
    });
  });

  it('cierra la sesión', async () => {
    const http = fakeClient();
    http.post.mockResolvedValueOnce(undefined);

    await createSessionService(http as unknown as HttpClient).logout();

    expect(http.post).toHaveBeenCalledWith('/sesion/cerrar');
  });

  it('obtiene el usuario de la sesión', async () => {
    const http = fakeClient();
    http.get.mockResolvedValueOnce(client);

    await expect(createSessionService(http as unknown as HttpClient).fetchOwnUser()).resolves.toBe(
      client,
    );
    expect(http.get).toHaveBeenCalledWith('/sesion/usuario');
  });

  it('sin sesión, el usuario es null', async () => {
    const http = fakeClient();
    http.get.mockRejectedValueOnce(new ApiError(401, ['Tu sesión no es válida o venció']));

    await expect(
      createSessionService(http as unknown as HttpClient).fetchOwnUser(),
    ).resolves.toBeNull();
  });

  it('otros errores al obtener el usuario se propagan', async () => {
    const http = fakeClient();
    const error = new ApiError(0, ['No se pudo conectar con el servidor']);
    http.get.mockRejectedValueOnce(error);

    await expect(createSessionService(http as unknown as HttpClient).fetchOwnUser()).rejects.toBe(
      error,
    );
  });

  it('cambia la contraseña propia', async () => {
    const http = fakeClient();
    http.put.mockResolvedValueOnce(undefined);

    await createSessionService(http as unknown as HttpClient).changePassword(
      'clave del estudio 2026',
      'otra clave segura 2026',
    );

    expect(http.put).toHaveBeenCalledWith('/sesion/contrasena', {
      contrasenaActual: 'clave del estudio 2026',
      contrasenaNueva: 'otra clave segura 2026',
    });
  });
});
