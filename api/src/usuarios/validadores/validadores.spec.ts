import { describe, expect, it } from 'vitest';
import { isValidCuit, isValidDni } from './documentos.js';
import { isValidEmail, MAX_EMAIL_LENGTH } from './email.js';
import { fitsMaxLength, isBlank, MAX_PHONE_LENGTH, MAX_TEXT_LENGTH } from './longitudes.js';
import { normalizeDocumentNumber, normalizeEmail } from './normalizar.js';

describe('normalizeEmail (RF-5)', () => {
  it('quita espacios al inicio y al final y pasa a minúsculas', () => {
    expect(normalizeEmail('  Juan.Perez@Estudio.COM ')).toBe('juan.perez@estudio.com');
  });
});

describe('normalizeDocumentNumber (RF-5)', () => {
  it.each([
    ['12.345.678', '12345678'],
    ['20-12345678-6', '20123456786'],
    [' 20 12345678 6 ', '20123456786'],
    ['1.234.567', '1234567'],
  ])('normaliza %s a %s', (input, expected) => {
    expect(normalizeDocumentNumber(input)).toBe(expected);
  });

  it('no borra letras ni otros símbolos, para que la validación los rechace', () => {
    expect(normalizeDocumentNumber('12a45678')).toBe('12a45678');
    expect(normalizeDocumentNumber('12/345/678')).toBe('12/345/678');
  });
});

describe('isValidDni (RF-6)', () => {
  it.each(['1234567', '12345678'])('acepta %s (7 u 8 dígitos)', (dni) => {
    expect(isValidDni(dni)).toBe(true);
  });

  it.each(['123456', '123456789', '12a45678', '', '12.345.678'])('rechaza %j', (dni) => {
    expect(isValidDni(dni)).toBe(false);
  });

  it('acepta un DNI escrito con puntos una vez normalizado', () => {
    expect(isValidDni(normalizeDocumentNumber('12.345.678'))).toBe(true);
  });
});

describe('isValidCuit (RF-6)', () => {
  it.each([
    '33693450239',
    '20123456786',
    '30712345671',
    '23000000000', // dígito verificador calculado 11, que se convierte en 0
  ])('acepta %s', (cuit) => {
    expect(isValidCuit(cuit)).toBe(true);
  });

  it.each([
    ['20123456787', 'dígito verificador incorrecto'],
    ['20123456760', 'el cálculo da 10: no existe dígito verificador válido'],
    ['2012345678', '10 dígitos'],
    ['201234567861', '12 dígitos'],
    ['2012345678a', 'contiene una letra'],
    ['', 'vacío'],
  ])('rechaza %s (%s)', (cuit) => {
    expect(isValidCuit(cuit)).toBe(false);
  });

  it('acepta un CUIT escrito con guiones y espacios una vez normalizado', () => {
    expect(isValidCuit(normalizeDocumentNumber('20-12345678-6'))).toBe(true);
    expect(isValidCuit(normalizeDocumentNumber('33 69345023 9'))).toBe(true);
  });
});

describe('isValidEmail (RF-6)', () => {
  it.each(['juan@estudio.com', 'j.perez+causas@mail.estudio.com.ar'])('acepta %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(['juan', 'juan@estudio', '@estudio.com', 'juan@.com', 'juan perez@estudio.com', ''])(
    'rechaza %j',
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );

  it(`rechaza emails de más de ${MAX_EMAIL_LENGTH} caracteres`, () => {
    const local = 'a'.repeat(64);
    const domain = `${'b'.repeat(MAX_EMAIL_LENGTH - local.length - 1 - 4)}.com`;
    expect(isValidEmail(`${local}@${domain}`)).toBe(true);
    expect(isValidEmail(`${local}a@${domain}`)).toBe(false);
  });
});

describe('longitudes (RF-6)', () => {
  it('define los máximos de la spec', () => {
    expect(MAX_TEXT_LENGTH).toBe(55);
    expect(MAX_PHONE_LENGTH).toBe(15);
  });

  it('acepta hasta el máximo y rechaza uno más', () => {
    expect(fitsMaxLength('a'.repeat(55), MAX_TEXT_LENGTH)).toBe(true);
    expect(fitsMaxLength('a'.repeat(56), MAX_TEXT_LENGTH)).toBe(false);
    expect(fitsMaxLength('1'.repeat(15), MAX_PHONE_LENGTH)).toBe(true);
    expect(fitsMaxLength('1'.repeat(16), MAX_PHONE_LENGTH)).toBe(false);
  });

  it('cuenta tildes, ñ y emojis como un carácter cada uno, igual que MySQL', () => {
    expect(fitsMaxLength('ñ'.repeat(55), MAX_TEXT_LENGTH)).toBe(true);
    expect(fitsMaxLength('😀'.repeat(55), MAX_TEXT_LENGTH)).toBe(true);
    expect(fitsMaxLength('😀'.repeat(56), MAX_TEXT_LENGTH)).toBe(false);
  });

  it('considera vacío un texto con solo espacios', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank('   ')).toBe(true);
    expect(isBlank(' Pérez ')).toBe(false);
  });
});
