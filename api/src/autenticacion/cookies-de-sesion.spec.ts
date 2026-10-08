import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './constantes.js';
import { setSessionCookies } from './cookies-de-sesion.js';

describe('setSessionCookies', () => {
  function cookiesSet() {
    const response = { cookie: vi.fn() };
    setSessionCookies(response as unknown as Response, {
      accessToken: 'acceso',
      refreshToken: '40.secreto',
    });
    return new Map(
      response.cookie.mock.calls.map(([name, value, options]) => [name, { value, options }]),
    );
  }

  it('el token de acceso vive 15 minutos', () => {
    expect(cookiesSet().get(ACCESS_TOKEN_COOKIE)?.options).toMatchObject({
      maxAge: 15 * 60_000,
      path: '/api',
      httpOnly: true,
    });
  });

  it('la cookie de renovación vive 75 minutos: el límite real lo pone la sesión en la base', () => {
    expect(cookiesSet().get(REFRESH_TOKEN_COOKIE)).toEqual({
      value: '40.secreto',
      options: expect.objectContaining({
        maxAge: 75 * 60_000,
        path: '/api/sesion',
        httpOnly: true,
      }),
    });
  });
});
