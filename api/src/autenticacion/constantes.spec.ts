import { describe, expect, it } from 'vitest';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_COOKIE_MAX_AGE_MS, sessionTtlMs } from './constantes.js';

const MINUTE = 60_000;

describe('sessionTtlMs', () => {
  it('da 20 minutos sin uso a la sesión de un cliente (spec 001, RF-12)', () => {
    expect(sessionTtlMs('cliente')).toBe(20 * MINUTE);
  });

  it.each(['admin', 'abogado'] as const)(
    'da 1 hora sin uso a la sesión de un %s (spec 001, RF-12)',
    (rol) => {
      expect(sessionTtlMs(rol)).toBe(60 * MINUTE);
    },
  );
});

describe('REFRESH_COOKIE_MAX_AGE_MS', () => {
  it('cubre la sesión más larga más la vida del token de acceso: 75 minutos', () => {
    expect(REFRESH_COOKIE_MAX_AGE_MS).toBe(75 * MINUTE);
    expect(REFRESH_COOKIE_MAX_AGE_MS).toBe(
      Math.max(sessionTtlMs('admin'), sessionTtlMs('abogado'), sessionTtlMs('cliente')) +
        ACCESS_TOKEN_TTL_SECONDS * 1000,
    );
  });
});
