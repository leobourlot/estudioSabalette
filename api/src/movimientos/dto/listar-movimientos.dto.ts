import { Transform, type TransformFnParams } from 'class-transformer';
import { toBoolean, toInteger } from '../../causas/dto/reglas-causa.js';
import { optional, Rule, type RuleFn } from '../../usuarios/dto/reglas.js';
import type { TipoMovimiento } from '../movimiento.entity.js';
import { isExistingDate } from '../reglas-movimientos.js';
import { tipoRule } from './reglas-movimiento.js';

const MAX_SEARCH_LENGTH = 100;

export const VISIBILITY_FILTERS = ['todos', 'visibles', 'ocultos'] as const;
export type FiltroVisibilidad = (typeof VISIBILITY_FILTERS)[number];

export const LIST_MESSAGES = {
  pagina: 'La página debe ser un número entero mayor o igual a 1',
  buscar: `La búsqueda no puede tener más de ${MAX_SEARCH_LENGTH} caracteres`,
  visibilidad: 'La visibilidad debe ser todos, visibles u ocultos',
  desde: 'La fecha desde no es válida',
  hasta: 'La fecha hasta no es válida',
  ocultarAnulados: 'El filtro ocultarAnulados debe ser true o false',
  rangoInvertido: 'La fecha desde no puede ser posterior a la fecha hasta',
} as const;

/** Recorta y une las tildes combinables del texto buscado. */
const toSearchText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().normalize('NFC') : value;

const dateRule =
  (message: string): RuleFn =>
  (value) =>
    typeof value === 'string' && isExistingDate(value) ? null : message;

/** RF-26: se controla solo si las dos fechas son válidas; si no, ya falla su propia regla. */
const rangeRule: RuleFn = (value, object) => {
  const desde = object.desde;
  if (typeof desde !== 'string' || typeof value !== 'string') return null;
  if (!isExistingDate(desde) || !isExistingDate(value)) return null;
  return desde > value ? LIST_MESSAGES.rangoInvertido : null;
};

/** Parámetros del historial de movimientos de una causa (RF-23 a RF-27). */
export class ListMovimientosQueryDto {
  @Transform(toInteger)
  @Rule(
    optional((value) =>
      Number.isInteger(value) && (value as number) >= 1 ? null : LIST_MESSAGES.pagina,
    ),
  )
  pagina?: number;

  @Transform(toSearchText)
  @Rule(
    optional((value) =>
      typeof value === 'string' && [...value].length <= MAX_SEARCH_LENGTH
        ? null
        : LIST_MESSAGES.buscar,
    ),
  )
  buscar?: string;

  @Rule(optional(tipoRule))
  tipo?: TipoMovimiento;

  @Rule(
    optional((value) =>
      (VISIBILITY_FILTERS as readonly unknown[]).includes(value) ? null : LIST_MESSAGES.visibilidad,
    ),
  )
  visibilidad?: FiltroVisibilidad;

  @Rule(optional(dateRule(LIST_MESSAGES.desde)))
  desde?: string;

  @Rule(
    optional(
      (value, object) => dateRule(LIST_MESSAGES.hasta)(value, object) ?? rangeRule(value, object),
    ),
  )
  hasta?: string;

  @Transform(toBoolean)
  @Rule(optional((value) => (typeof value === 'boolean' ? null : LIST_MESSAGES.ocultarAnulados)))
  ocultarAnulados?: boolean;
}
