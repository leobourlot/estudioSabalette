import type { CookieOptions, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_MAX_AGE_MS,
  REFRESH_TOKEN_COOKIE,
} from './constantes.js';

// httpOnly: el código de la página no puede leerlas. Secure: solo viajan por HTTPS
// (los navegadores aceptan localhost). SameSite=Lax: no viajan en peticiones de otros sitios.
const BASE_OPTIONS: CookieOptions = { httpOnly: true, secure: true, sameSite: 'lax' };

// El token de acceso viaja a toda la API; el de renovación, solo a /api/sesion.
const ACCESS_OPTIONS: CookieOptions = { ...BASE_OPTIONS, path: '/api' };
const REFRESH_OPTIONS: CookieOptions = { ...BASE_OPTIONS, path: '/api/sesion' };

export function setSessionCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
): void {
  response.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...ACCESS_OPTIONS,
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...REFRESH_OPTIONS,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

export function clearSessionCookies(response: Response): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, ACCESS_OPTIONS);
  response.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_OPTIONS);
}
