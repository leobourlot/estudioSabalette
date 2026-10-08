import type { Rol } from '../usuarios/usuario.entity.js';

// Nombres y vidas de las credenciales de sesión (ver plan 001, "Flujo de la sesión").
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

const MINUTE_MS = 60_000;

// La sesión vence tras un tiempo sin uso que depende del rol (spec 001, RF-12; spec 004, RF-4).
// Cada consulta al servidor y cada renovación corren el vencimiento.
export const SESSION_IDLE_TTL_MS: Readonly<Record<Rol, number>> = {
  cliente: 20 * MINUTE_MS,
  admin: 60 * MINUTE_MS,
  abogado: 60 * MINUTE_MS,
};

export function sessionTtlMs(rol: Rol): number {
  return SESSION_IDLE_TTL_MS[rol];
}

// La cookie de renovación solo tiene que durar lo suficiente; el límite real es `venceEn` en la
// base. La última petición ocurre a lo sumo una vida del token de acceso después de la última
// renovación, y la sesión vence a lo sumo la duración más larga después de esa petición.
export const REFRESH_COOKIE_MAX_AGE_MS =
  Math.max(...Object.values(SESSION_IDLE_TTL_MS)) + ACCESS_TOKEN_TTL_SECONDS * 1000;

export const INVALID_SESSION_MESSAGE = 'Tu sesión no es válida o venció. Volvé a ingresar';
