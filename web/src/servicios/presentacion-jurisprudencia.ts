import type { PalabraClaveSugerencia } from './jurisprudencia';

/**
 * Presentación de la jurisprudencia (spec 005): mensajes del listado vacío y textos de las
 * sugerencias. No importa React (principio 3).
 */

export const EMPTY_LIST_MESSAGES = {
  noRulings: 'Todavía no hay fallos cargados',
  noMatches: 'No hay fallos que coincidan con la búsqueda',
} as const;

export interface EmptyListState {
  /** Mensaje a mostrar, o null si no corresponde ninguno. */
  mensaje: string | null;
  /** Si se ofrece "Volver a la primera página" (RF-28). */
  ofrecerPrimeraPagina: boolean;
}

/**
 * Qué mostrar cuando una página del listado llega vacía:
 * - En una página que no es la primera, la página no existe: ningún mensaje, y se ofrece
 *   volver a la primera (RF-28).
 * - Si no hay ningún fallo que pueda aparecer sin buscador ni filtros, "Todavía no hay fallos
 *   cargados", aunque se haya buscado o filtrado (RF-27).
 * - Si hay fallos pero ninguno coincide, "No hay fallos que coincidan con la búsqueda".
 */
export function emptyListMessage({
  hayFallos,
  pagina,
}: {
  hayFallos: boolean;
  pagina: number;
}): EmptyListState {
  if (pagina > 1) return { mensaje: null, ofrecerPrimeraPagina: true };
  return {
    mensaje: hayFallos ? EMPTY_LIST_MESSAGES.noMatches : EMPTY_LIST_MESSAGES.noRulings,
    ofrecerPrimeraPagina: false,
  };
}

/** Texto de una sugerencia con la cantidad de fallos que la usan: "daño moral (12)" (RF-13). */
export function suggestionLabel(sugerencia: PalabraClaveSugerencia): string {
  return `${sugerencia.texto} (${sugerencia.cantidad})`;
}
