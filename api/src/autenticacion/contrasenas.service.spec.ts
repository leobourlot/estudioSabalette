import { describe, expect, it } from 'vitest';
import { PASSWORD_MESSAGES, PasswordsService } from './contrasenas.service.js';

const passwords = new PasswordsService();

describe('PasswordsService — reglas de RF-39', () => {
  it.each([
    ['una contraseña de 10 caracteres', 'abcdefghij'],
    ['una contraseña de 64 caracteres', 'a'.repeat(64)],
    ['espacios', 'mi clave del estudio'],
    ['símbolos del teclado', 'Cl@ve_Segura!#2026$%&*()[]{}<>?'],
  ])('acepta %s', (_case, password) => {
    expect(passwords.findRuleViolation(password)).toBeNull();
  });

  it.each([
    ['tilde', 'Pérez1234567'],
    ['tilde en mayúscula', 'ÁrbolSeguro12'],
    ['ñ', 'contraseña1234'],
    ['emoji', 'claveSegura😀2026'],
  ])('rechaza contraseñas con %s', (_case, password) => {
    expect(passwords.findRuleViolation(password)).toBe(PASSWORD_MESSAGES.invalidCharacters);
  });

  it('rechaza contraseñas de menos de 10 caracteres', () => {
    expect(passwords.findRuleViolation('abcdefghi')).toBe(PASSWORD_MESSAGES.tooShort);
  });

  it('rechaza contraseñas de más de 64 caracteres', () => {
    expect(passwords.findRuleViolation('a'.repeat(65))).toBe(PASSWORD_MESSAGES.tooLong);
  });

  it('valida primero los caracteres y después el largo', () => {
    expect(passwords.findRuleViolation('ñandú')).toBe(PASSWORD_MESSAGES.invalidCharacters);
  });

  it('al cambiar la propia, rechaza una contraseña igual a la actual', () => {
    expect(passwords.findRuleViolation('mi clave del estudio', 'mi clave del estudio')).toBe(
      PASSWORD_MESSAGES.sameAsCurrent,
    );
    expect(passwords.findRuleViolation('mi clave nueva 2026', 'mi clave del estudio')).toBeNull();
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

describe('PasswordsService — hash (RF-40)', () => {
  const password = 'mi clave del estudio';

  it('genera un hash bcrypt con costo 12 que no contiene la contraseña', async () => {
    const hash = await passwords.hash(password);

    expect(hash.startsWith('$2b$12$')).toBe(true);
    expect(hash).not.toContain(password);
  });

  it('genera hashes distintos para la misma contraseña (sal aleatoria)', async () => {
    expect(await passwords.hash(password)).not.toBe(await passwords.hash(password));
  });

  it('acepta la contraseña correcta y rechaza otra', async () => {
    const hash = await passwords.hash(password);

    expect(await passwords.verify(password, hash)).toBe(true);
    expect(await passwords.verify('otra clave del estudio', hash)).toBe(false);
  });
});
