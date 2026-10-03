/**
 * Validaciones del frontend (RF-5, RF-6, RF-39): las mismas reglas y mensajes que la API
 * (api/src/usuarios/validadores y api/src/autenticacion/contrasenas.service.ts), para avisar
 * antes de enviar. La API sigue siendo la fuente de verdad. No importa React (principio 3).
 */

export const MAX_TEXT_LENGTH = 55;
export const MAX_PHONE_LENGTH = 15;
export const MAX_EMAIL_LENGTH = 254;

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 64;
const CUIT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

// Solo ASCII imprimible: letras sin tilde, números, espacio y símbolos del teclado.
const ALLOWED_PASSWORD_CHARACTERS = /^[\x20-\x7E]*$/;

export const PASSWORD_MESSAGES = {
  invalidCharacters: 'La contraseña no puede tener tildes, ñ ni emojis',
  tooShort: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
  tooLong: `La contraseña no puede tener más de ${MAX_PASSWORD_LENGTH} caracteres`,
  sameAsCurrent: 'La contraseña nueva debe ser distinta de la actual',
} as const;

// --- Normalización ---

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Quita puntos, guiones y espacios; cualquier otro carácter queda para que se rechace. */
export function normalizeDocumentNumber(value: string): string {
  return value.replace(/[.\-\s]/g, '');
}

// --- Reglas ---

export function isValidDni(value: string): boolean {
  return /^\d{7,8}$/.test(value);
}

export function isValidCuit(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const sum = CUIT_WEIGHTS.reduce((total, weight, index) => total + weight * digits[index], 0);
  const remainder = 11 - (sum % 11);
  if (remainder === 10) return false;
  return (remainder === 11 ? 0 : remainder) === digits[10];
}

export function isValidEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Cuenta caracteres Unicode (un emoji es uno), igual que las columnas de MySQL. */
export function fitsMaxLength(value: string, max: number): boolean {
  return [...value].length <= max;
}

export function isBlank(value: string): boolean {
  return value.trim() === '';
}

/** Primera regla de RF-39 que no se cumple, o null. `current` solo al cambiar la propia. */
export function findPasswordRuleViolation(password: string, current?: string): string | null {
  if (!ALLOWED_PASSWORD_CHARACTERS.test(password)) return PASSWORD_MESSAGES.invalidCharacters;
  if (password.length < MIN_PASSWORD_LENGTH) return PASSWORD_MESSAGES.tooShort;
  if (password.length > MAX_PASSWORD_LENGTH) return PASSWORD_MESSAGES.tooLong;
  if (current !== undefined && password === current) return PASSWORD_MESSAGES.sameAsCurrent;
  return null;
}

// --- Mensajes por campo, para los formularios ---

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (email === '') return 'El email es obligatorio';
  return isValidEmail(email) ? null : 'El email debe tener el formato texto@texto.texto';
}

export function validateDni(value: string): string | null {
  const dni = normalizeDocumentNumber(value);
  if (dni === '') return 'El DNI es obligatorio para personas físicas';
  return isValidDni(dni) ? null : 'El DNI debe tener 7 u 8 dígitos';
}

export function validateCuit(value: string): string | null {
  const cuit = normalizeDocumentNumber(value);
  if (cuit === '') return 'El CUIT es obligatorio para personas jurídicas';
  return isValidCuit(cuit) ? null : 'El CUIT debe tener 11 dígitos y un dígito verificador válido';
}
