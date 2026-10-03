import { describe, expect, it } from 'vitest';
import {
  findPasswordRuleViolation,
  fitsMaxLength,
  isBlank,
  isValidCuit,
  isValidDni,
  isValidEmail,
  MAX_EMAIL_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_TEXT_LENGTH,
  normalizeDocumentNumber,
  normalizeEmail,
  PASSWORD_MESSAGES,
  validateCuit,
  validateDni,
  validateEmail,
} from './validaciones';

// Mismos casos que los tests de la API (validadores.spec.ts y contrasenas.service.spec.ts):
// el frontend avisa antes de enviar, pero la API sigue siendo la fuente de verdad.

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
  it.each(['1234567', '12345678'])('acepta %s', (dni) => {
    expect(isValidDni(dni)).toBe(true);
  });

  it.each(['123456', '123456789', '12a45678', '', '12.345.678'])('rechaza %j', (dni) => {
    expect(isValidDni(dni)).toBe(false);
  });
});

describe('isValidCuit (RF-6)', () => {
  it.each(['33693450239', '20123456786', '30712345671', '23000000000'])('acepta %s', (cuit) => {
    expect(isValidCuit(cuit)).toBe(true);
  });

  it.each([
    ['20123456787', 'dígito verificador incorrecto'],
    ['20123456760', 'el cálculo da 10'],
    ['2012345678', '10 dígitos'],
    ['201234567861', '12 dígitos'],
    ['2012345678a', 'contiene una letra'],
    ['', 'vacío'],
  ])('rechaza %s (%s)', (cuit) => {
    expect(isValidCuit(cuit)).toBe(false);
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

describe('mensajes de campo, con los mismos textos que la API', () => {
  it('valida el DNI normalizándolo antes', () => {
    expect(validateDni('30.123.456')).toBeNull();
    expect(validateDni('')).toBe('El DNI es obligatorio para personas físicas');
    expect(validateDni('123456')).toBe('El DNI debe tener 7 u 8 dígitos');
  });

  it('valida el CUIT normalizándolo antes', () => {
    expect(validateCuit('30-71234567-1')).toBeNull();
    expect(validateCuit(' ')).toBe('El CUIT es obligatorio para personas jurídicas');
    expect(validateCuit('30712345672')).toBe(
      'El CUIT debe tener 11 dígitos y un dígito verificador válido',
    );
  });

  it('valida el email normalizándolo antes', () => {
    expect(validateEmail(' Juan@Estudio.com ')).toBeNull();
    expect(validateEmail('')).toBe('El email es obligatorio');
    expect(validateEmail('juan@estudio')).toBe('El email debe tener el formato texto@texto.texto');
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

describe('findPasswordRuleViolation (RF-39)', () => {
  it.each([
    ['una contraseña de 10 caracteres', 'abcdefghij'],
    ['una contraseña de 64 caracteres', 'a'.repeat(64)],
    ['espacios', 'mi clave del estudio'],
    ['símbolos del teclado', 'Cl@ve_Segura!#2026$%&*()[]{}<>?'],
  ])('acepta %s', (_case, password) => {
    expect(findPasswordRuleViolation(password)).toBeNull();
  });

  it.each([
    ['tilde', 'Pérez1234567'],
    ['tilde en mayúscula', 'ÁrbolSeguro12'],
    ['ñ', 'contraseña1234'],
    ['emoji', 'claveSegura😀2026'],
  ])('rechaza contraseñas con %s', (_case, password) => {
    expect(findPasswordRuleViolation(password)).toBe(PASSWORD_MESSAGES.invalidCharacters);
  });

  it('rechaza contraseñas de menos de 10 y de más de 64 caracteres', () => {
    expect(findPasswordRuleViolation('abcdefghi')).toBe(PASSWORD_MESSAGES.tooShort);
    expect(findPasswordRuleViolation('a'.repeat(65))).toBe(PASSWORD_MESSAGES.tooLong);
  });

  it('valida primero los caracteres y después el largo', () => {
    expect(findPasswordRuleViolation('ñandú')).toBe(PASSWORD_MESSAGES.invalidCharacters);
  });

  it('al cambiar la propia, rechaza una contraseña igual a la actual', () => {
    expect(findPasswordRuleViolation('mi clave del estudio', 'mi clave del estudio')).toBe(
      PASSWORD_MESSAGES.sameAsCurrent,
    );
    expect(findPasswordRuleViolation('mi clave nueva 2026', 'mi clave del estudio')).toBeNull();
  });

  it('usa los mensajes exactos de la spec', () => {
    expect(PASSWORD_MESSAGES).toEqual({
      invalidCharacters: 'La contraseña no puede tener tildes, ñ ni emojis',
      tooShort: 'La contraseña debe tener al menos 10 caracteres',
      tooLong: 'La contraseña no puede tener más de 64 caracteres',
      sameAsCurrent: 'La contraseña nueva debe ser distinta de la actual',
    });
  });
});
