import type { EscritoCompletado, TipoEscrito } from './modelos-escritos';
import type { VariableGroup } from './texto-modelo';

/**
 * Presentación de los modelos de escritos (spec 006): etiquetas, mensajes del listado vacío,
 * avisos del escrito completado y textos del portapapeles. No importa React (principio 3).
 */

export const TEMPLATE_TYPE_OPTIONS: readonly [TipoEscrito, string][] = [
  ['demanda', 'Demanda'],
  ['contestacion_demanda', 'Contestación de demanda'],
  ['escrito_tramite', 'Escrito de trámite'],
  ['recurso', 'Recurso'],
  ['oficio', 'Oficio'],
  ['cedula', 'Cédula'],
  ['otro', 'Otro'],
];

const TEMPLATE_TYPE_LABELS = new Map(TEMPLATE_TYPE_OPTIONS);

export const tipoEscritoLabel = (tipo: TipoEscrito): string =>
  TEMPLATE_TYPE_LABELS.get(tipo) ?? tipo;

/** Grupos del catálogo de variables, en el orden en que se muestran al cargar un modelo (RF-11). */
export const VARIABLE_GROUP_OPTIONS: readonly [VariableGroup, string][] = [
  ['causa', 'Datos de la causa'],
  ['partes', 'Partes por rol'],
  ['clientes', 'Clientes de la causa'],
  ['abogados', 'Abogados'],
  ['fecha', 'Fecha del día'],
];

/** Leyenda de la ficha de un modelo cuyo texto no tiene marcas (RF-16). */
export const NO_VARIABLES_LEGEND = 'Este modelo no usa variables';

// --- Listado vacío (RF-23, RF-24) ---

export const EMPTY_MODEL_LIST_MESSAGES = {
  noModels: 'Todavía no hay modelos cargados',
  noMatches: 'No hay modelos que coincidan con la búsqueda',
} as const;

export interface EmptyModelListState {
  /** Mensaje a mostrar, o null si no corresponde ninguno. */
  mensaje: string | null;
  /** Si se ofrece "Volver a la primera página" (RF-24). */
  ofrecerPrimeraPagina: boolean;
}

/**
 * Qué mostrar cuando una página del listado llega vacía:
 * - En una página que no es la primera, la página no existe: ningún mensaje, y se ofrece
 *   volver a la primera (RF-24).
 * - Si no hay ningún modelo que pueda aparecer sin buscador ni filtros, "Todavía no hay modelos
 *   cargados", aunque se haya buscado o filtrado (RF-23).
 * - Si hay modelos pero ninguno coincide, "No hay modelos que coincidan con la búsqueda".
 */
export function emptyModelListMessage({
  hayModelos,
  pagina,
}: {
  hayModelos: boolean;
  pagina: number;
}): EmptyModelListState {
  if (pagina > 1) return { mensaje: null, ofrecerPrimeraPagina: true };
  return {
    mensaje: hayModelos ? EMPTY_MODEL_LIST_MESSAGES.noMatches : EMPTY_MODEL_LIST_MESSAGES.noModels,
    ofrecerPrimeraPagina: false,
  };
}

// --- Avisos del escrito completado (RF-39, RF-40) ---

export const ESCRITO_NOTICE_MESSAGES = {
  missingData: 'A esta causa le faltan datos que el modelo usa',
  deactivatedClients: 'Hay clientes con la cuenta desactivada',
  deactivatedResponsable: 'El responsable de esta causa está desactivado',
} as const;

/** Un aviso informativo: no exige confirmación ni impide copiar. */
export interface EscritoNotice {
  mensaje: string;
  /** Lo que falta, o los nombres de los clientes; vacío si el aviso no lleva lista. */
  detalle: string[];
}

/** Los avisos que van arriba del escrito, en orden; vacío si no corresponde ninguno. */
export function escritoNotices(
  escrito: Pick<EscritoCompletado, 'faltantes' | 'clientesDesactivados' | 'responsableDesactivado'>,
): EscritoNotice[] {
  const notices: EscritoNotice[] = [];
  if (escrito.faltantes.length > 0) {
    notices.push({ mensaje: ESCRITO_NOTICE_MESSAGES.missingData, detalle: escrito.faltantes });
  }
  if (escrito.clientesDesactivados.length > 0) {
    notices.push({
      mensaje: ESCRITO_NOTICE_MESSAGES.deactivatedClients,
      detalle: escrito.clientesDesactivados,
    });
  }
  if (escrito.responsableDesactivado) {
    notices.push({ mensaje: ESCRITO_NOTICE_MESSAGES.deactivatedResponsable, detalle: [] });
  }
  return notices;
}

// --- Portapapeles (RF-44, RF-45) ---

export const COPIED_MESSAGE = 'Escrito copiado';

export const COPY_FAILED_MESSAGE = 'No se pudo copiar. Seleccioná el texto y copialo a mano';

/** Va siempre junto a "Copiar". */
export const CLIPBOARD_LEGEND =
  'El escrito copiado queda en este equipo hasta que copies otra cosa o cierres sesión';
