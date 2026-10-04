/** Símbolos permitidos en la carátula, los números de expediente y el juzgado (RF-4). */
export const ALLOWED_SYMBOLS = '. , ; : / - _ ( ) " \' $ & # ° º ª';

// Letras de cualquier alfabeto (incluidas las que llevan tilde, la ñ y la ü), números,
// el espacio común y los símbolos de ALLOWED_SYMBOLS. Excluye emojis, saltos de línea y
// tabulaciones.
const ALLOWED_CHARACTERS = /^[\p{L}\p{N} .,;:/\-_()"'$&#°ºª]*$/u;

/**
 * Une cada letra con su tilde combinable en un solo carácter (NFC). Se aplica antes de
 * validar, para que "é" escrita como "e" + tilde cuente como una letra y no se rechace.
 */
export function normalizeCausaText(value: string): string {
  return value.normalize('NFC');
}

/** Texto ya normalizado con normalizeCausaText (RF-4). */
export function hasOnlyAllowedCharacters(value: string): boolean {
  return ALLOWED_CHARACTERS.test(value);
}

/** Mensaje de RF-5 para un campo, por ejemplo "La carátula". */
export function allowedCharactersMessage(field: string): string {
  return `${field} solo puede tener letras, números, espacios y los símbolos ${ALLOWED_SYMBOLS}`;
}

/**
 * Número de expediente sin separadores, solo letras y dígitos, para que la búsqueda
 * encuentre "1234-2024" al escribir "1234/2024" (RF-37). No se usa para el control de
 * duplicados: quitar separadores puede igualar números distintos.
 */
export function toSearchableCaseNumber(value: string): string {
  return value.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');
}
