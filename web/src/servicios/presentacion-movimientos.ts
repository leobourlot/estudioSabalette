import type {
  AccionMovimiento,
  AutorResumen,
  CampoMovimiento,
  FiltroVisibilidad,
  TipoMovimiento,
} from './movimientos';
import { EMPTY_VALUE } from './presentacion';

/** Cómo se muestran los datos de los movimientos. Funciones puras, sin React (principio 3). */

/** Lista cerrada de tipos de la spec 003 (RF-1), en su orden, como [valor, etiqueta]. */
export const MOVEMENT_TYPE_OPTIONS: readonly [TipoMovimiento, string][] = [
  ['escrito_presentado', 'Escrito presentado'],
  ['providencia', 'Providencia'],
  ['resolucion', 'Resolución'],
  ['sentencia', 'Sentencia'],
  ['notificacion', 'Notificación'],
  ['audiencia', 'Audiencia'],
  ['pericia', 'Pericia'],
  ['oficio', 'Oficio'],
  ['otro', 'Otro'],
];

export const VISIBILITY_FILTER_OPTIONS: readonly [FiltroVisibilidad, string][] = [
  ['todos', 'Todos'],
  ['visibles', 'Visibles para el cliente'],
  ['ocultos', 'Ocultos para el cliente'],
];

const ACTION_OPTIONS: readonly [AccionMovimiento, string][] = [
  ['carga', 'Carga'],
  ['modificacion', 'Modificación'],
  ['anulacion', 'Anulación'],
  ['restauracion', 'Restauración'],
];

const FIELD_OPTIONS: readonly [CampoMovimiento, string][] = [
  ['fecha', 'Fecha'],
  ['tipo', 'Tipo'],
  ['descripcion', 'Descripción'],
  ['textoCliente', 'Texto para el cliente'],
  ['visible', 'Visible para el cliente'],
  ['anulado', 'Anulado'],
];

const labelFrom =
  <T extends string>(options: readonly [T, string][]) =>
  (value: T): string =>
    options.find(([option]) => option === value)?.[1] ?? value;

export const tipoMovimientoLabel = labelFrom(MOVEMENT_TYPE_OPTIONS);
export const accionLabel = labelFrom(ACTION_OPTIONS);
export const campoLabel = labelFrom(FIELD_OPTIONS);

/**
 * Fecha del movimiento AAAA-MM-DD como dd/mm/aaaa. Reordena el texto, sin `Date`: leer
 * "2024-03-01" como fecha en UTC y mostrarla en Buenos Aires daría el día anterior (plan
 * 003, "Fecha del movimiento").
 */
export function formatMovementDate(fecha: string): string {
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

/** Caracteres de la descripción que se muestran en el historial antes de "Ver completa" (RF-24). */
export const DESCRIPTION_PREVIEW_LENGTH = 200;

/** La descripción recortada en puntos de código, con "…", e indica si se recortó (RF-24). */
export function truncateDescription(descripcion: string): { texto: string; recortada: boolean } {
  const characters = [...descripcion];
  if (characters.length <= DESCRIPTION_PREVIEW_LENGTH) {
    return { texto: descripcion, recortada: false };
  }
  return {
    texto: `${characters.slice(0, DESCRIPTION_PREVIEW_LENGTH).join('').trimEnd()}…`,
    recortada: true,
  };
}

/** "Apellido, Nombre", marcando a quien dejó el estudio (RF-36). */
export function authorName(autor: AutorResumen): string {
  const name = `${autor.apellido}, ${autor.nombre}`;
  return autor.activo ? name : `${name} (desactivado)`;
}

/** Un valor del historial de cambios como se muestra (RF-22). */
export function formatChangeValue(campo: CampoMovimiento, valor: string | boolean | null): string {
  if (valor === null) return EMPTY_VALUE;
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (campo === 'fecha') return formatMovementDate(valor);
  if (campo === 'tipo') return tipoMovimientoLabel(valor as TipoMovimiento);
  return valor;
}
