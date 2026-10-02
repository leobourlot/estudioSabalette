export const MAX_EMAIL_LENGTH = 254;

/** Formato texto@texto.texto, sin espacios, de hasta 254 caracteres (RF-6). */
export function isValidEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
