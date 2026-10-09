/**
 * Reglas de la jurisprudencia que no necesitan la base (plan 005, "Reglas de negocio"). Los
 * services las consultan.
 */
import { todayInBuenosAires } from '../movimientos/reglas-movimientos.js';
import { convertText } from './validadores/texto-fallo.js';

/** Fecha mínima de un fallo (RF-7): permite cargar fallos históricos de la Corte Suprema. */
export const MIN_FALLO_DATE = '1800-01-01';

export const REPEATED_RULING_MESSAGES = {
  byNumber: 'Ya existe un fallo con ese número en ese tribunal',
  byCaption: 'Ya existe un fallo con esa carátula, tribunal y fecha',
} as const;

/**
 * Forma de comparación flexible de RF-9: el texto convertido (RF-3), sin marcas diacríticas
 * y en minúsculas. Al quitar las marcas, la ñ pasa a n, la ü a u y las vocales con tilde a
 * su vocal. Es la clave única de cada palabra del catálogo (RF-11).
 */
export function flexibleKey(texto: string): string {
  return convertText(texto, { multilinea: false })
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .normalize('NFC');
}

/** Las palabras clave sin repetidas por comparación flexible, en su primera aparición (RF-14). */
export function uniqueKeywords(textos: readonly string[]): string[] {
  const seen = new Set<string>();
  return textos.filter((texto) => {
    const key = flexibleKey(texto);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * RF-7: desde el 01/01/1800 hasta el día actual en Buenos Aires, inclusive. Recibe una fecha
 * AAAA-MM-DD ya verificada como existente; en ese formato, comparar textos es comparar fechas.
 */
export function isFalloDateInRange(fecha: string, ahora: Date = new Date()): boolean {
  return fecha >= MIN_FALLO_DATE && fecha <= todayInBuenosAires(ahora);
}

/** Mensaje del aviso de repetido de RF-18. */
export function repeatedRulingMessage(porNumero: boolean): string {
  return porNumero ? REPEATED_RULING_MESSAGES.byNumber : REPEATED_RULING_MESSAGES.byCaption;
}
