import { describe, expect, it } from 'vitest';
import { initialsOf, pageTitle } from './presentacion-sitio';

describe('pageTitle (spec 007, RF-34)', () => {
  it('suma " · " y el nombre del estudio', () => {
    expect(pageTitle('Sucesiones')).toBe('Sucesiones · Pertusatti | Sabalette - Abogadas');
  });
});

describe('initialsOf (spec 007, RF-21)', () => {
  it.each([
    ['Carolina Pertusatti', 'CP'],
    ['Vanesa Sabalette Rabello', 'VSR'],
    ['  ana   maría  ', 'AM'],
    ['Ñandú Álvarez', 'ÑÁ'],
  ])('%s → %s', (nombre, iniciales) => {
    expect(initialsOf(nombre)).toBe(iniciales);
  });
});
