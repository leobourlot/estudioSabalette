import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

const BCRYPT_COST = 12;
const MIN_LENGTH = 10;
const MAX_LENGTH = 64;

// Solo ASCII imprimible: letras sin tilde, números, espacio y símbolos del teclado.
// Con 64 caracteres ASCII como máximo, nunca se supera el límite de 72 bytes de bcrypt.
const ALLOWED_CHARACTERS = /^[\x20-\x7E]*$/;

export const PASSWORD_MESSAGES = {
  invalidCharacters: 'La contraseña no puede tener tildes, ñ ni emojis',
  tooShort: `La contraseña debe tener al menos ${MIN_LENGTH} caracteres`,
  tooLong: `La contraseña no puede tener más de ${MAX_LENGTH} caracteres`,
  sameAsCurrent: 'La contraseña nueva debe ser distinta de la actual',
} as const;

@Injectable()
export class PasswordsService {
  /**
   * Devuelve el mensaje de la primera regla de RF-39 que no se cumple, o null.
   * `current` se pasa solo cuando el usuario cambia su propia contraseña.
   */
  findRuleViolation(password: string, current?: string): string | null {
    if (!ALLOWED_CHARACTERS.test(password)) return PASSWORD_MESSAGES.invalidCharacters;
    if (password.length < MIN_LENGTH) return PASSWORD_MESSAGES.tooShort;
    if (password.length > MAX_LENGTH) return PASSWORD_MESSAGES.tooLong;
    if (current !== undefined && password === current) return PASSWORD_MESSAGES.sameAsCurrent;
    return null;
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
