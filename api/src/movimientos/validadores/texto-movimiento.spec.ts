import { describe, expect, it } from 'vitest';
import { MAX_MOVEMENT_TEXT_LENGTH } from './longitudes.js';
import {
  ALLOWED_SYMBOLS,
  allowedCharactersMessage,
  hasOnlyAllowedCharacters,
  normalizeMovementText,
  textLength,
} from './texto-movimiento.js';

describe('normalizeMovementText (RF-3)', () => {
  it('une una letra y su tilde combinable en un solo carácter (NFC)', () => {
    const decomposed = 'Pérez';
    expect(decomposed).toHaveLength(6);
    expect(normalizeMovementText(decomposed)).toBe('Pérez');
  });

  it('convierte \\r\\n y \\r en \\n', () => {
    expect(normalizeMovementText('uno\r\ndos\rtres\ncuatro')).toBe('uno\ndos\ntres\ncuatro');
  });

  it('quita los espacios y saltos de línea del principio y del final', () => {
    expect(normalizeMovementText(' \n \r\n Providencia \n\n ')).toBe('Providencia');
  });

  it('conserva los saltos de línea intermedios, incluidas las líneas en blanco', () => {
    expect(normalizeMovementText('Primer párrafo.\n\n\nSegundo párrafo.')).toBe(
      'Primer párrafo.\n\n\nSegundo párrafo.',
    );
  });

  it('no quita una tabulación de los extremos: queda para que la rechace la regla de caracteres', () => {
    expect(normalizeMovementText('\tProvidencia ')).toBe('\tProvidencia');
  });

  it('deja vacío un texto que solo tiene espacios y saltos de línea', () => {
    expect(normalizeMovementText('  \n\r\n  ')).toBe('');
  });
});

describe('hasOnlyAllowedCharacters (RF-4)', () => {
  it.each([
    'Se presentó escrito de contestación de demanda.',
    'Muñoz y Güemes',
    'ÁÉÍÓÚ áéíóú Ññ Üü',
    'Primer párrafo.\n\nSegundo párrafo.',
    '¿Hay audiencia? ¡Sí! Honorarios del 20 %',
    'Expte. Nº 45.678; folio 3ª: "incidente" (art. 250) $ & # _ \' / -',
    '',
  ])('acepta %j', (text) => {
    expect(hasOnlyAllowedCharacters(text)).toBe(true);
  });

  it('acepta cada uno de los símbolos permitidos', () => {
    for (const symbol of ALLOWED_SYMBOLS.split(' ')) {
      expect(hasOnlyAllowedCharacters(`a${symbol}b`), symbol).toBe(true);
    }
  });

  it.each([
    ['un emoji', 'Providencia 😀'],
    ['una tabulación', 'Providencia\tfirme'],
    ['una tabulación en un extremo', normalizeMovementText('\tProvidencia')],
    ['un retorno de carro sin normalizar', 'uno\rdos'],
    ['<', 'a < b'],
    ['>', 'a > b'],
    ['{', 'a { b'],
    ['}', 'a } b'],
    ['[', 'a [ b'],
    [']', 'a ] b'],
    ['\\', 'a \\ b'],
    ['|', 'a | b'],
    ['=', 'a = b'],
    ['el acento grave', 'a ` b'],
    ['un intento de inyección', '<script>alert(1)</script>'],
  ])('rechaza %s', (_case, text) => {
    expect(hasOnlyAllowedCharacters(text)).toBe(false);
  });

  it('acepta una tilde combinable una vez normalizado el texto', () => {
    expect(hasOnlyAllowedCharacters(normalizeMovementText('Pérez'))).toBe(true);
  });
});

describe('textLength (RF-1, RF-4)', () => {
  it('cuenta cada salto de línea como un carácter, aunque venga como \\r\\n', () => {
    expect(textLength(normalizeMovementText('a\r\nb'))).toBe(3);
  });

  it('cuenta en puntos de código: una letra de dos unidades UTF-16 es un carácter', () => {
    const letter = '𝐀';
    expect(letter).toHaveLength(2);
    expect(hasOnlyAllowedCharacters(letter)).toBe(true);
    expect(textLength(letter)).toBe(1);
  });

  it('el máximo es 2.000 caracteres', () => {
    expect(MAX_MOVEMENT_TEXT_LENGTH).toBe(2000);
    expect(textLength('a'.repeat(2000))).toBeLessThanOrEqual(MAX_MOVEMENT_TEXT_LENGTH);
    expect(textLength('a'.repeat(2001))).toBeGreaterThan(MAX_MOVEMENT_TEXT_LENGTH);
  });

  it('2.000 letras de dos unidades UTF-16 no superan el máximo', () => {
    expect(textLength('𝐀'.repeat(2000))).toBe(MAX_MOVEMENT_TEXT_LENGTH);
    expect(textLength('𝐀'.repeat(2001))).toBeGreaterThan(MAX_MOVEMENT_TEXT_LENGTH);
  });
});

describe('allowedCharactersMessage (RF-6)', () => {
  it('nombra el campo y enumera los símbolos permitidos', () => {
    expect(allowedCharactersMessage('La descripción')).toBe(
      'La descripción solo puede tener letras, números, espacios, saltos de línea y los símbolos . , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! %',
    );
  });
});
