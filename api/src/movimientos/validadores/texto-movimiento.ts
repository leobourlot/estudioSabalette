/**
 * Símbolos permitidos en la descripción y en el texto para el cliente (RF-4): los de la
 * spec 002 más ¿ ? ¡ ! %.
 */
export const ALLOWED_SYMBOLS = '. , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! %';

// Letras de cualquier alfabeto (incluidas las que llevan tilde, la ñ y la ü), números, el
// espacio común, el salto de línea y los símbolos de ALLOWED_SYMBOLS. Excluye emojis,
// tabulaciones y los signos que permiten inyectar código (< > { } [ ] \ | = `).
const ALLOWED_CHARACTERS = /^[\p{L}\p{N} \n.,;:/\-_()"'$&#°ºª¿?¡!%]*$/u;

/**
 * Normaliza un texto recibido (plan 003, "Textos"): une cada letra con su tilde combinable
 * (NFC), convierte \r\n y \r en \n para que cada salto de línea cuente como un carácter, y
 * quita solo los espacios y saltos de línea de los extremos (RF-3). Una tabulación en un
 * extremo no se quita: la rechaza hasOnlyAllowedCharacters.
 */
export function normalizeMovementText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/^[ \n]+|[ \n]+$/g, '');
}

/** Texto ya normalizado con normalizeMovementText (RF-4). */
export function hasOnlyAllowedCharacters(value: string): boolean {
  return ALLOWED_CHARACTERS.test(value);
}

/** Largo en puntos de código, como cuenta los caracteres MySQL en utf8mb4. */
export function textLength(value: string): number {
  return [...value].length;
}

/** Mensaje de RF-6 para un campo, por ejemplo "La descripción". */
export function allowedCharactersMessage(field: string): string {
  return `${field} solo puede tener letras, números, espacios, saltos de línea y los símbolos ${ALLOWED_SYMBOLS}`;
}
