/**
 * Textos de un modelo de escrito (spec 006, RF-3 a RF-5; plan 006, "Textos"). Las
 * conversiones son las de la jurisprudencia (spec 005, RF-3): acá no se copian, se usan. El
 * título y la descripción se validan con las reglas de caracteres de las specs 002 y 003; solo
 * el texto tiene una regla propia, porque acepta además el @.
 */
import { convertText } from '../../jurisprudencia/validadores/texto-fallo.js';

/** Símbolos permitidos en el texto de un modelo (RF-4): los de un movimiento más @. */
export const ALLOWED_TEXT_SYMBOLS = '. , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! % @';

// Letras de cualquier alfabeto (incluidas las que llevan tilde, la ñ y la ü), números, el
// espacio común, el salto de línea y los símbolos de ALLOWED_TEXT_SYMBOLS. Excluye emojis,
// tabulaciones y los signos que permiten inyectar código (< > { } [ ] \ | = `).
const ALLOWED_TEXT_CHARACTERS = /^[\p{L}\p{N} \n.,;:/\-_()"'$&#°ºª¿?¡!%@]*$/u;

/**
 * Texto de un modelo: las conversiones de la spec 005 en varias líneas y, además, sin espacios
 * al inicio ni al final de cada línea, porque un modelo es texto plano y no guarda sangría
 * (RF-3, RF-5). convertText ya redujo los espacios repetidos y quitó los saltos de línea de los
 * extremos; las líneas en blanco intermedias quedan como se cargaron.
 */
export function convertModelText(value: string): string {
  return convertText(value, { multilinea: true }).replace(/ *\n */g, '\n');
}

/** Texto ya convertido con convertModelText (RF-4). */
export function hasOnlyModelTextCharacters(value: string): boolean {
  return ALLOWED_TEXT_CHARACTERS.test(value);
}
