import { describe, expect, it } from 'vitest';
import {
  ALLOWED_SYMBOLS,
  allowedCharactersMessage,
  hasOnlyAllowedCharacters,
  normalizeCausaText,
  toSearchableCaseNumber,
} from './texto-causa.js';

describe('normalizeCausaText (RF-4)', () => {
  it('une una letra y su tilde combinable en un solo carácter (NFC)', () => {
    const decomposed = 'Pérez';
    expect(decomposed).toHaveLength(6);
    expect(normalizeCausaText(decomposed)).toBe('Pérez');
    expect(normalizeCausaText(decomposed)).toHaveLength(5);
  });

  it('no cambia un texto que ya está normalizado', () => {
    expect(normalizeCausaText('Juzgado Civil N° 3')).toBe('Juzgado Civil N° 3');
  });
});

describe('hasOnlyAllowedCharacters (RF-4)', () => {
  it.each([
    'Pérez, Juan c/ Gómez S.A. s/ daños y perjuicios',
    'Muñoz y Güemes',
    'ÁÉÍÓÚ áéíóú Ññ Üü',
    'Juzgado Civil y Comercial N° 3 - Concordia',
    '1234/2024',
    'Expte. Nº 45.678; folio 3ª: "incidente" (art. 250) $ & # _ \'',
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
    ['un emoji', 'Pérez 😀'],
    ['un salto de línea', 'Pérez\nGómez'],
    ['un retorno de carro', 'Pérez\rGómez'],
    ['una tabulación', 'Pérez\tGómez'],
    ['un símbolo no permitido', 'Pérez * Gómez'],
    ['un guion largo', 'Pérez – Gómez'],
  ])('rechaza %s', (_case, text) => {
    expect(hasOnlyAllowedCharacters(text)).toBe(false);
  });

  it('acepta una tilde combinable una vez normalizado el texto', () => {
    expect(hasOnlyAllowedCharacters(normalizeCausaText('Pérez'))).toBe(true);
  });
});

describe('allowedCharactersMessage (RF-5)', () => {
  it('nombra el campo y enumera los símbolos permitidos', () => {
    expect(allowedCharactersMessage('La carátula')).toBe(
      'La carátula solo puede tener letras, números, espacios y los símbolos . , ; : / - _ ( ) " \' $ & # ° º ª',
    );
  });
});

describe('toSearchableCaseNumber (RF-37)', () => {
  it.each([
    ['1234/2024', '12342024'],
    ['1234-2024', '12342024'],
    ['1234 2024', '12342024'],
    ['CIV 1234/2024', 'CIV12342024'],
    ['Nº 45.678/1', 'Nº456781'],
  ])('convierte %j en %j', (input, expected) => {
    expect(toSearchableCaseNumber(input)).toBe(expected);
  });

  it('da el mismo resultado para el mismo número con distintos separadores', () => {
    expect(toSearchableCaseNumber('1234/2024')).toBe(toSearchableCaseNumber('1234-2024'));
  });

  it('devuelve vacío si no hay letras ni dígitos', () => {
    expect(toSearchableCaseNumber('/ - .')).toBe('');
  });
});
