import { ApiError, httpClient, type HttpClient } from './cliente-http';

/**
 * Sesión del frontend: llamadas a /api/sesion y las reglas de navegación por rol
 * (RF-8, RF-11, RF-17, RF-20). No importa React (principio 3).
 */

export type Rol = 'admin' | 'abogado' | 'cliente';
export type TipoPersona = 'fisica' | 'juridica';

/** Datos propios del usuario, como los devuelve la API (plan 001, `UsuarioPropio`). */
export interface UsuarioPropio {
  id: number;
  rol: Rol;
  esPrincipal: boolean;
  email: string | null;
  nombre: string;
  apellido: string;
  debeCambiarContrasena: boolean;
  cliente: {
    tipoPersona: TipoPersona;
    dni: string | null;
    cuit: string | null;
    razonSocial: string | null;
    telefono: string | null;
    domicilio: string | null;
  } | null;
}

export const ROUTES = {
  login: '/ingresar',
  changePassword: '/cambiar-contrasena',
  panel: '/panel',
  portal: '/portal',
} as const;

export type AccessDecision = { allowed: true } | { allowed: false; redirectTo: string };

const isUnder = (path: string, section: string) =>
  path === section || path.startsWith(`${section}/`);

const sectionOf = (usuario: UsuarioPropio) =>
  usuario.rol === 'cliente' ? ROUTES.portal : ROUTES.panel;

/** A dónde va un usuario después de ingresar (RF-8): el cambio pendiente tiene prioridad (RF-11). */
export function resolveLandingRoute(usuario: UsuarioPropio): string {
  return usuario.debeCambiarContrasena ? ROUTES.changePassword : sectionOf(usuario);
}

/**
 * Si el usuario puede ver la ruta o a dónde hay que llevarlo. Es solo comodidad de
 * navegación: el control real lo hace la API (RF-19).
 */
export function canAccess(path: string, usuario: UsuarioPropio | null): AccessDecision {
  const redirect = (redirectTo: string): AccessDecision => ({ allowed: false, redirectTo });
  const isProtected =
    isUnder(path, ROUTES.panel) || isUnder(path, ROUTES.portal) || path === ROUTES.changePassword;

  if (path === ROUTES.login) {
    return usuario ? redirect(resolveLandingRoute(usuario)) : { allowed: true };
  }
  if (!isProtected) return { allowed: true };
  if (!usuario) return redirect(ROUTES.login);

  if (path === ROUTES.changePassword) return { allowed: true };
  if (usuario.debeCambiarContrasena) return redirect(ROUTES.changePassword);

  // Cada rol en su sección (RF-20).
  const ownSection = sectionOf(usuario);
  return isUnder(path, ownSection) ? { allowed: true } : redirect(ownSection);
}

export function createSessionService(http: HttpClient) {
  return {
    login: (email: string, contrasena: string) =>
      http.post<UsuarioPropio>('/sesion/ingresar', { email, contrasena }),

    logout: () => http.post<void>('/sesion/cerrar'),

    /** Usuario de la sesión, o null si no hay sesión (o no se pudo renovar). */
    async fetchOwnUser(): Promise<UsuarioPropio | null> {
      try {
        return await http.get<UsuarioPropio>('/sesion/usuario');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },

    changePassword: (contrasenaActual: string, contrasenaNueva: string) =>
      http.put<void>('/sesion/contrasena', { contrasenaActual, contrasenaNueva }),
  };
}

export type SessionService = ReturnType<typeof createSessionService>;

export const sessionService = createSessionService(httpClient);
