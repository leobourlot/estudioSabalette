import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginAttemptLimiter } from './limitador-intentos.service.js';

const MINUTE = 60_000;
const WINDOW = 15 * MINUTE;
const IP = '203.0.113.10';
const EMAIL = 'juan@estudio.com';

function consumeTimes(limiter: LoginAttemptLimiter, times: number, ip: string, email: string) {
  const results: boolean[] = [];
  for (let i = 0; i < times; i++) results.push(limiter.consumeAttempt(ip, email));
  return results;
}

describe('LoginAttemptLimiter (RF-10)', () => {
  let limiter: LoginAttemptLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T12:00:00-03:00'));
    limiter = new LoginAttemptLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite 5 intentos con un mismo email e IP y bloquea el sexto', () => {
    expect(consumeTimes(limiter, 5, IP, EMAIL)).toEqual([true, true, true, true, true]);
    expect(limiter.consumeAttempt(IP, EMAIL)).toBe(false);
  });

  it('cuenta juntos el mismo email escrito con mayúsculas o espacios', () => {
    consumeTimes(limiter, 3, IP, 'Juan@Estudio.com ');
    consumeTimes(limiter, 2, IP, ' juan@estudio.com');
    expect(limiter.consumeAttempt(IP, EMAIL)).toBe(false);
  });

  it('no bloquea a otro email desde la misma IP (oficina compartida)', () => {
    consumeTimes(limiter, 6, IP, EMAIL);
    expect(limiter.consumeAttempt(IP, 'ana@estudio.com')).toBe(true);
  });

  it('no bloquea al mismo email desde otra IP', () => {
    consumeTimes(limiter, 6, IP, EMAIL);
    expect(limiter.consumeAttempt('198.51.100.7', EMAIL)).toBe(true);
  });

  it('permite 30 intentos desde una misma IP y bloquea el 31, aunque sea otro email', () => {
    const results = Array.from({ length: 30 }, (_, i) =>
      limiter.consumeAttempt(IP, `usuario${i}@estudio.com`),
    );
    expect(results.every(Boolean)).toBe(true);
    expect(limiter.consumeAttempt(IP, 'nuevo@estudio.com')).toBe(false);
  });

  it('desbloquea a los 15 minutos del primer intento, no antes', () => {
    consumeTimes(limiter, 5, IP, EMAIL);

    vi.advanceTimersByTime(WINDOW - 1);
    expect(limiter.consumeAttempt(IP, EMAIL)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(limiter.consumeAttempt(IP, EMAIL)).toBe(true);
  });

  it('los intentos rechazados no corren la ventana', () => {
    consumeTimes(limiter, 5, IP, EMAIL);

    for (let minute = 1; minute < 15; minute++) {
      vi.advanceTimersByTime(MINUTE);
      expect(limiter.consumeAttempt(IP, EMAIL)).toBe(false);
    }

    vi.advanceTimersByTime(MINUTE);
    expect(limiter.consumeAttempt(IP, EMAIL)).toBe(true);
  });

  it('empieza una ventana nueva con el contador en cero', () => {
    consumeTimes(limiter, 5, IP, EMAIL);
    vi.advanceTimersByTime(WINDOW);

    expect(consumeTimes(limiter, 5, IP, EMAIL)).toEqual([true, true, true, true, true]);
    expect(limiter.consumeAttempt(IP, EMAIL)).toBe(false);
  });

  it('olvida las claves vencidas para no acumular memoria', () => {
    consumeTimes(limiter, 3, IP, EMAIL);
    consumeTimes(limiter, 3, '198.51.100.7', 'ana@estudio.com');
    expect(limiter.trackedKeys).toBe(4);

    vi.advanceTimersByTime(WINDOW);
    limiter.consumeAttempt('192.0.2.1', 'otro@estudio.com');

    expect(limiter.trackedKeys).toBe(2);
  });
});
