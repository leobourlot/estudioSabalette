import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginAttemptLimiter } from './limitador-intentos.service.js';

const MINUTE = 60_000;
const WINDOW = 15 * MINUTE;
const IP = '203.0.113.10';
const DNI = '20111222';

function consumeTimes(limiter: LoginAttemptLimiter, times: number, ip: string, document: string) {
  const results: boolean[] = [];
  for (let i = 0; i < times; i++) results.push(limiter.consumeAttempt(ip, document));
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

  it('permite 5 intentos con un mismo DNI e IP y bloquea el sexto', () => {
    expect(consumeTimes(limiter, 5, IP, DNI)).toEqual([true, true, true, true, true]);
    expect(limiter.consumeAttempt(IP, DNI)).toBe(false);
  });

  it('cuenta juntos el mismo DNI escrito con puntos, guiones o espacios', () => {
    consumeTimes(limiter, 3, IP, '20.111.222 ');
    consumeTimes(limiter, 2, IP, ' 20-111-222');
    expect(limiter.consumeAttempt(IP, DNI)).toBe(false);
  });

  it('no bloquea a otro DNI desde la misma IP (oficina compartida)', () => {
    consumeTimes(limiter, 6, IP, DNI);
    expect(limiter.consumeAttempt(IP, '27333444')).toBe(true);
  });

  it('no bloquea al mismo DNI desde otra IP', () => {
    consumeTimes(limiter, 6, IP, DNI);
    expect(limiter.consumeAttempt('198.51.100.7', DNI)).toBe(true);
  });

  it('permite 30 intentos desde una misma IP y bloquea el 31, aunque sea otro DNI', () => {
    const results = Array.from({ length: 30 }, (_, i) =>
      limiter.consumeAttempt(IP, String(30000000 + i)),
    );
    expect(results.every(Boolean)).toBe(true);
    expect(limiter.consumeAttempt(IP, '30999999')).toBe(false);
  });

  it('desbloquea a los 15 minutos del primer intento, no antes', () => {
    consumeTimes(limiter, 5, IP, DNI);

    vi.advanceTimersByTime(WINDOW - 1);
    expect(limiter.consumeAttempt(IP, DNI)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(limiter.consumeAttempt(IP, DNI)).toBe(true);
  });

  it('los intentos rechazados no corren la ventana', () => {
    consumeTimes(limiter, 5, IP, DNI);

    for (let minute = 1; minute < 15; minute++) {
      vi.advanceTimersByTime(MINUTE);
      expect(limiter.consumeAttempt(IP, DNI)).toBe(false);
    }

    vi.advanceTimersByTime(MINUTE);
    expect(limiter.consumeAttempt(IP, DNI)).toBe(true);
  });

  it('empieza una ventana nueva con el contador en cero', () => {
    consumeTimes(limiter, 5, IP, DNI);
    vi.advanceTimersByTime(WINDOW);

    expect(consumeTimes(limiter, 5, IP, DNI)).toEqual([true, true, true, true, true]);
    expect(limiter.consumeAttempt(IP, DNI)).toBe(false);
  });

  it('olvida las claves vencidas para no acumular memoria', () => {
    consumeTimes(limiter, 3, IP, DNI);
    consumeTimes(limiter, 3, '198.51.100.7', '27333444');
    expect(limiter.trackedKeys).toBe(4);

    vi.advanceTimersByTime(WINDOW);
    limiter.consumeAttempt('192.0.2.1', '30712345671');

    expect(limiter.trackedKeys).toBe(2);
  });
});
