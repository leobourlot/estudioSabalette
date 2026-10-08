import { describe, expect, it } from 'vitest';
import { CLIENT_IDLE_LIMIT_MS, isIdleExpired } from './inactividad';

describe('inactividad del cliente (spec 004, RF-4, RF-5)', () => {
  const lastActivity = new Date('2026-10-08T12:00:00Z').getTime();

  it('el límite es de 20 minutos, como la sesión del cliente en el servidor', () => {
    expect(CLIENT_IDLE_LIMIT_MS).toBe(20 * 60_000);
  });

  it('un milisegundo antes de los 20 minutos, la sesión sigue', () => {
    expect(isIdleExpired(lastActivity, lastActivity + CLIENT_IDLE_LIMIT_MS - 1)).toBe(false);
  });

  it('justo a los 20 minutos, venció', () => {
    expect(isIdleExpired(lastActivity, lastActivity + CLIENT_IDLE_LIMIT_MS)).toBe(true);
  });

  it('acepta otro límite', () => {
    expect(isIdleExpired(lastActivity, lastActivity + 1000, 1000)).toBe(true);
    expect(isIdleExpired(lastActivity, lastActivity + 999, 1000)).toBe(false);
  });
});
