import { describe, expect, it } from 'vitest';
import {
  createSessionSecret,
  formatRefreshToken,
  hashSessionSecret,
  parseRefreshToken,
  sameHash,
} from './tokens.js';

describe('tokens de sesión', () => {
  it('lee un token de renovación armado con formatRefreshToken', () => {
    const secret = createSessionSecret();

    expect(parseRefreshToken(formatRefreshToken(40, secret))).toEqual({ sessionId: 40, secret });
  });

  it.each([
    undefined,
    '',
    'sin-punto',
    '.secreto',
    '40.',
    'abc.secreto',
    '0.secreto',
    '-3.secreto',
    '4.5.secreto',
    '1e3.secreto',
  ])('rechaza el token %j', (token) => {
    expect(parseRefreshToken(token)).toBeNull();
  });

  it('compara hashes de forma segura', () => {
    const hash = hashSessionSecret('secreto');

    expect(sameHash(hash, hashSessionSecret('secreto'))).toBe(true);
    expect(sameHash(hash, hashSessionSecret('otro'))).toBe(false);
    expect(sameHash(hash, null)).toBe(false);
  });
});
