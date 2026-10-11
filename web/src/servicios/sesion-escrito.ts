import { EMPTY_MODEL_FILTERS, type ModelFilters } from './formulario-modelo';
import { JURISDICTION_OPTIONS } from './presentacion-causas';
import { TEMPLATE_TYPE_OPTIONS } from './presentacion-modelos';

/**
 * Pantalla de un escrito completado (spec 006, RF-32 y RF-48; plan 006, "Sesión, inactividad y
 * portapapeles"): el límite de inactividad de un integrante y el estado con el que se vuelve a
 * la lista de modelos de la causa. No importa React (principio 3).
 */

/**
 * El mismo límite que la sesión de un administrador o un abogado en el servidor (spec 001,
 * RF-12). Pasado ese tiempo sin pedidos, la pantalla deja de mostrar el escrito.
 */
export const STAFF_IDLE_LIMIT_MS = 60 * 60_000;

/** Dónde estaba la lista de modelos de una causa cuando se eligió un modelo. */
export interface ModelListState {
  filtros: ModelFilters;
  pagina: number;
}

export const INITIAL_MODEL_LIST_STATE: ModelListState = { filtros: EMPTY_MODEL_FILTERS, pagina: 1 };

/**
 * Lo que viaja en el estado de navegación entre la lista de modelos y el escrito, para volver
 * a la misma página con la misma búsqueda y los mismos filtros (RF-32). No va en la dirección,
 * para que el texto buscado no quede en ella, ni en el almacenamiento del navegador. Nunca
 * incluye el escrito ni datos de la causa.
 */
export interface ModelListLocationState {
  listaDeModelos: ModelListState;
}

export function toModelListLocationState(state: ModelListState): ModelListLocationState {
  return { listaDeModelos: { filtros: { ...state.filtros }, pagina: state.pagina } };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isOneOf = (options: readonly (readonly [string, string])[], value: unknown) =>
  value === '' || options.some(([option]) => option === value);

/**
 * El estado de la lista que trae la navegación, o null si no hay o no tiene la forma esperada:
 * el estado de navegación puede venir de otra pantalla. La lista de una causa nunca muestra
 * desactivados (RF-29), así que esa casilla no se recupera.
 */
export function modelListStateFrom(locationState: unknown): ModelListState | null {
  if (!isRecord(locationState) || !isRecord(locationState.listaDeModelos)) return null;
  const { filtros, pagina } = locationState.listaDeModelos;
  if (!Number.isInteger(pagina) || (pagina as number) < 1) return null;
  if (!isRecord(filtros) || typeof filtros.buscar !== 'string') return null;
  if (!isOneOf(TEMPLATE_TYPE_OPTIONS, filtros.tipo)) return null;
  if (!isOneOf(JURISDICTION_OPTIONS, filtros.fuero)) return null;
  return {
    filtros: {
      buscar: filtros.buscar,
      tipo: filtros.tipo as ModelFilters['tipo'],
      fuero: filtros.fuero as ModelFilters['fuero'],
      incluirDesactivados: false,
    },
    pagina: pagina as number,
  };
}
