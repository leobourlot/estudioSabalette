import { describe, expect, it } from 'vitest';
import { hasOnlyAllowedCharacters as hasOnlyCausaCharacters } from '../../causas/validadores/texto-causa.js';
import {
  hasOnlyAllowedCharacters as hasOnlyMovementCharacters,
  textLength,
} from '../../movimientos/validadores/texto-movimiento.js';
import { MAX_SUMARIO_LENGTH } from './longitudes.js';
import { convertText } from './texto-fallo.js';

const singleLine = (value: string) => convertText(value, { multilinea: false });
const multiline = (value: string) => convertText(value, { multilinea: true });

describe('convertText: tabla de conversiones (RF-3)', () => {
  it.each([
    ['“', '"'],
    ['”', '"'],
    ['„', '"'],
    ['‟', '"'],
    ['«', '"'],
    ['»', '"'],
    ['″', '"'],
    ['‘', "'"],
    ['’', "'"],
    ['‚', "'"],
    ['‛', "'"],
    ['‹', "'"],
    ['›', "'"],
    ['′', "'"],
    ['´', "'"],
    ['‐', '-'],
    ['‑', '-'],
    ['‒', '-'],
    ['–', '-'],
    ['—', '-'],
    ['―', '-'],
    ['−', '-'],
    ['•', '-'],
    ['◦', '-'],
    ['‣', '-'],
    ['▪', '-'],
    ['…', '...'],
    ['№', 'Nº'],
    ['[', '('],
    [']', ')'],
  ])('convierte %j en %j', (from, to) => {
    expect(singleLine(`a${from}b`)).toBe(`a${to}b`);
    expect(multiline(`a${from}b`)).toBe(`a${to}b`);
  });

  it.each([
    ['espacio de no separación', '\u00A0'],
    ['espacio ogam', '\u1680'],
    ['espacio en', '\u2000'],
    ['espacio fino', '\u2009'],
    ['espacio ultrafino', '\u200A'],
    ['espacio estrecho de no separación', '\u202F'],
    ['espacio matemático', '\u205F'],
    ['espacio ideográfico', '\u3000'],
    ['tabulación', '\t'],
  ])('convierte el %s en un espacio', (_name, space) => {
    expect(singleLine(`a${space}b`)).toBe('a b');
    expect(multiline(`a${space}b`)).toBe('a b');
  });

  it('convierte una cita recortada entre corchetes en paréntesis', () => {
    expect(multiline('El tribunal sostuvo que "[...] corresponde indemnizar"')).toBe(
      'El tribunal sostuvo que "(...) corresponde indemnizar"',
    );
  });
});

describe('convertText: signo de párrafo (RF-3)', () => {
  it('convierte §§ en "párrs." antes que § en "párr."', () => {
    expect(singleLine('§§ 4 y 5')).toBe('párrs. 4 y 5');
    expect(singleLine('§ 3')).toBe('párr. 3');
  });

  it('agrega un espacio si lo sigue un carácter que no es un espacio', () => {
    expect(singleLine('§3')).toBe('párr. 3');
    expect(singleLine('§§4')).toBe('párrs. 4');
  });

  it('no deja doble espacio cuando ya lo sigue un espacio', () => {
    expect(singleLine('ver § 3')).toBe('ver párr. 3');
  });

  it('no agrega un espacio al final del texto ni antes de un salto de línea', () => {
    expect(singleLine('ver §')).toBe('ver párr.');
    expect(multiline('ver §\nsigue')).toBe('ver párr.\nsigue');
  });
});

describe('convertText: invisibles y saltos de línea (RF-3)', () => {
  it.each([
    ['espacio de ancho cero', '\u200B'],
    ['no unión de ancho cero', '\u200C'],
    ['unión de ancho cero', '\u200D'],
    ['unión de palabras', '\u2060'],
    ['guion de corte opcional', '\u00AD'],
    ['marca de orden de bytes', '\uFEFF'],
  ])('elimina el %s', (_name, invisible) => {
    expect(singleLine(`da${invisible}ño`)).toBe('daño');
    expect(multiline(`da${invisible}ño`)).toBe('daño');
  });

  it('convierte los separadores de línea y de párrafo Unicode en saltos de línea', () => {
    expect(multiline('uno\u2028dos\u2029tres')).toBe('uno\ndos\ntres');
  });

  it('convierte \\r\\n y \\r en \\n', () => {
    expect(multiline('uno\r\ndos\rtres')).toBe('uno\ndos\ntres');
  });

  it('en una sola línea, cada salto de línea pasa a ser un espacio', () => {
    expect(singleLine('Pérez c/ López\ns/ daños')).toBe('Pérez c/ López s/ daños');
    expect(singleLine('Pérez\r\nLópez\u2028García')).toBe('Pérez López García');
  });

  it('une una letra y su tilde combinable en un solo carácter (NFC)', () => {
    // "e" seguida de la tilde combinable (U+0301).
    const decomposed = `Pe${String.fromCharCode(0x301)}rez`;
    expect(decomposed).toHaveLength(6);
    expect(singleLine(decomposed)).toBe('Pérez');
  });
});

describe('convertText: espacios (RF-3)', () => {
  it('reduce a uno los espacios repetidos y recorta los extremos en una sola línea', () => {
    expect(singleLine('  CNCiv.   Sala  A  ')).toBe('CNCiv. Sala A');
  });

  it('una carátula pegada en dos líneas con espacios queda con un solo espacio', () => {
    expect(singleLine('Pérez c/ López  \n  s/ daños')).toBe('Pérez c/ López s/ daños');
  });

  it('en multilínea conserva los saltos de línea y las líneas en blanco', () => {
    expect(multiline('Primer párrafo.\n\n\nSegundo párrafo.')).toBe(
      'Primer párrafo.\n\n\nSegundo párrafo.',
    );
  });

  it('en multilínea reduce los espacios repetidos dentro de cada línea', () => {
    expect(multiline('Primer   párrafo.\n\nSegundo  \t párrafo.')).toBe(
      'Primer párrafo.\n\nSegundo párrafo.',
    );
  });

  it('en multilínea quita los espacios y saltos de línea de los extremos', () => {
    expect(multiline(' \n \r\n Sumario del fallo. \n\n ')).toBe('Sumario del fallo.');
  });

  it('deja vacío un texto que solo tiene espacios, invisibles y saltos de línea', () => {
    expect(singleLine(' \u00A0\t\u200B\n ')).toBe('');
    expect(multiline(' \u00A0\t\u200B\n ')).toBe('');
  });
});

describe('convertText con las reglas de caracteres de las specs 002 y 003 (RF-3 a RF-5)', () => {
  it('un sumario pegado de una base jurídica queda aceptado', () => {
    const pasted =
      '“La responsabilidad objetiva…” — CNCiv., Sala A, §3.\r\n\r\n\t• Ver [...] el considerando 5º.';
    const converted = multiline(pasted);
    // La tabulación y la viñeta del principio de la línea quedan como " -": solo se recortan
    // los extremos del texto completo, no los de cada línea.
    expect(converted).toBe(
      '"La responsabilidad objetiva..." - CNCiv., Sala A, párr. 3.\n\n - Ver (...) el considerando 5º.',
    );
    expect(hasOnlyMovementCharacters(converted)).toBe(true);
  });

  it('una carátula pegada con comillas y guiones tipográficos queda aceptada', () => {
    const converted = singleLine('“Pérez” c/ López – s/ daños № 3');
    expect(converted).toBe('"Pérez" c/ López - s/ daños Nº 3');
    expect(hasOnlyCausaCharacters(converted)).toBe(true);
  });

  it.each(['<', '>', '{', '}', '\\', '|', '=', '`', '😀'])(
    'después de convertir, %j se sigue rechazando',
    (character) => {
      expect(hasOnlyMovementCharacters(multiline(`texto ${character} texto`))).toBe(false);
      expect(hasOnlyCausaCharacters(singleLine(`texto ${character} texto`))).toBe(false);
    },
  );

  it('ningún texto aceptado contiene corchetes: siempre llegan convertidos', () => {
    const converted = multiline('[a] [[b]] ]c[');
    expect(converted).not.toMatch(/[[\]]/);
    expect(hasOnlyMovementCharacters(converted)).toBe(true);
  });

  it('el largo se cuenta después de convertir: 4.999 caracteres con un "…" quedan en 5.001', () => {
    const sumario = `${'a'.repeat(4998)}…`;
    expect(textLength(sumario)).toBe(4999);
    const converted = multiline(sumario);
    expect(textLength(converted)).toBe(5001);
    expect(textLength(converted)).toBeGreaterThan(MAX_SUMARIO_LENGTH);
  });
});
