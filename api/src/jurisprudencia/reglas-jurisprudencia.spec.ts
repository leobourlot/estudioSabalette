import { describe, expect, it } from 'vitest';
import {
  flexibleKey,
  isFalloDateInRange,
  REPEATED_RULING_MESSAGES,
  repeatedRulingMessage,
  uniqueKeywords,
} from './reglas-jurisprudencia.js';

describe('flexibleKey: comparación flexible (RF-9, RF-11)', () => {
  it.each([
    ['Daño Moral', 'dano moral'],
    ['Daño Moral', 'DANO MORAL'],
    ['año', 'ano'],
    ['pingüino', 'pinguino'],
    ['Responsabilidad Médica', 'responsabilidad medica'],
    ['daño  moral', 'daño moral'],
    [' daño moral ', 'daño moral'],
    ['“daño” moral', '"daño" moral'],
  ])('%j y %j tienen la misma clave', (a, b) => {
    expect(flexibleKey(a)).toBe(flexibleKey(b));
  });

  it('"daño-moral" y "daño moral" tienen claves distintas', () => {
    expect(flexibleKey('daño-moral')).not.toBe(flexibleKey('daño moral'));
  });

  it('la clave está en minúsculas, sin tildes, diéresis ni ñ', () => {
    expect(flexibleKey('Ñandú Güemes ÁÉÍÓÚ')).toBe('nandu guemes aeiou');
  });
});

describe('uniqueKeywords (RF-14)', () => {
  it('descarta las repetidas por comparación flexible y conserva la primera aparición', () => {
    expect(
      uniqueKeywords(['Daño moral', 'accidente', 'dano moral', 'DAÑO MORAL', 'Accidente']),
    ).toEqual(['Daño moral', 'accidente']);
  });

  it('conserva el orden de las distintas', () => {
    expect(uniqueKeywords(['c', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });

  it('una lista vacía queda vacía', () => {
    expect(uniqueKeywords([])).toEqual([]);
  });
});

describe('isFalloDateInRange (RF-7)', () => {
  // 15/06/2026 a las 15:00 en Buenos Aires.
  const ahora = new Date('2026-06-15T18:00:00Z');

  it('acepta el 01/01/1800 y rechaza el 31/12/1799', () => {
    expect(isFalloDateInRange('1800-01-01', ahora)).toBe(true);
    expect(isFalloDateInRange('1799-12-31', ahora)).toBe(false);
  });

  it('acepta el día actual y rechaza el siguiente', () => {
    expect(isFalloDateInRange('2026-06-15', ahora)).toBe(true);
    expect(isFalloDateInRange('2026-06-16', ahora)).toBe(false);
  });

  it('el día actual es el de Buenos Aires: cambia a las 03:00 UTC', () => {
    expect(isFalloDateInRange('2026-06-16', new Date('2026-06-16T02:59:00Z'))).toBe(false);
    expect(isFalloDateInRange('2026-06-16', new Date('2026-06-16T03:00:00Z'))).toBe(true);
  });
});

describe('repeatedRulingMessage (RF-18)', () => {
  it('por número', () => {
    expect(repeatedRulingMessage(true)).toBe('Ya existe un fallo con ese número en ese tribunal');
    expect(REPEATED_RULING_MESSAGES.byNumber).toBe(repeatedRulingMessage(true));
  });

  it('por carátula, tribunal y fecha', () => {
    expect(repeatedRulingMessage(false)).toBe(
      'Ya existe un fallo con esa carátula, tribunal y fecha',
    );
  });
});
