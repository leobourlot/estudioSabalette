import { Transform, type TransformFnParams } from 'class-transformer';
import { fueroRule, toBoolean, toInteger } from '../../causas/dto/reglas-causa.js';
import type { Fuero } from '../../causas/causa.entity.js';
import { isExistingDate, todayInBuenosAires } from '../../movimientos/reglas-movimientos.js';
import {
  hasOnlyAllowedCharacters as hasOnlyMovementCharacters,
  textLength,
} from '../../movimientos/validadores/texto-movimiento.js';
import { optional, Rule, type RuleFn } from '../../usuarios/dto/reglas.js';
import { MIN_FALLO_DATE } from '../reglas-jurisprudencia.js';
import { MAX_KEYWORDS, MAX_SEARCH_LENGTH } from '../validadores/longitudes.js';
import { convertText } from '../validadores/texto-fallo.js';
import { FALLO_MESSAGES } from './reglas-fallo.js';

export const LIST_FALLOS_MESSAGES = {
  pagina: 'La página debe ser un número entero mayor o igual a 1',
  buscarCharacters: 'La búsqueda tiene caracteres no permitidos',
  buscarTooLong: `La búsqueda puede tener hasta ${MAX_SEARCH_LENGTH} caracteres`,
  palabrasClave: `Las palabras clave del filtro deben ser hasta ${MAX_KEYWORDS} ids`,
  rangoInvertido: 'La fecha desde no puede ser posterior a la fecha hasta',
  incluirDesactivados: 'El filtro incluirDesactivados debe ser true o false',
} as const;

/**
 * Texto de búsqueda (RF-24): las conversiones de RF-3 en una línea. Vacío o con solo
 * espacios equivale a no haber buscado nada.
 */
export const toSearchText = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const text = convertText(value, { multilinea: false });
  return text === '' ? undefined : text;
};

/**
 * Ids de palabras clave separados por coma ("3,7,12"). Si alguno no es un id, queda el texto
 * original para que lo rechace la regla. Vacío equivale a no filtrar.
 */
const toIdList = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  if (value.trim() === '') return undefined;
  const parts = value.split(',').map((part) => part.trim());
  return parts.every((part) => /^\d+$/.test(part)) ? parts.map(Number) : value;
};

/** Búsqueda ya convertida: caracteres del sumario sin saltos de línea y hasta 100 (RF-24). */
export const searchRule: RuleFn = (value) => {
  if (typeof value !== 'string') return LIST_FALLOS_MESSAGES.buscarCharacters;
  if (textLength(value) > MAX_SEARCH_LENGTH) return LIST_FALLOS_MESSAGES.buscarTooLong;
  return hasOnlyMovementCharacters(value) && !value.includes('\n')
    ? null
    : LIST_FALLOS_MESSAGES.buscarCharacters;
};

const idListRule: RuleFn = (value) =>
  Array.isArray(value) &&
  value.length <= MAX_KEYWORDS &&
  value.every((id) => Number.isInteger(id) && (id as number) >= 1)
    ? null
    : LIST_FALLOS_MESSAGES.palabrasClave;

/** Fecha del filtro: existente y en el rango de la fecha del fallo (RF-26). */
const filterDateRule: RuleFn = (value) => {
  if (typeof value !== 'string' || !isExistingDate(value)) return FALLO_MESSAGES.fechaInvalid;
  if (value < MIN_FALLO_DATE) return FALLO_MESSAGES.fechaBeforeMin;
  return value > todayInBuenosAires(new Date()) ? FALLO_MESSAGES.fechaFuture : null;
};

/** RF-26: se controla solo si las dos fechas son válidas; si no, ya falla su propia regla. */
const rangeRule: RuleFn = (value, object) => {
  const desde = object.desde;
  if (filterDateRule(desde, object) !== null || filterDateRule(value, object) !== null) return null;
  return (desde as string) > (value as string) ? LIST_FALLOS_MESSAGES.rangoInvertido : null;
};

/** Parámetros del listado de jurisprudencia (RF-21, RF-23 a RF-26). */
export class ListFallosQueryDto {
  @Transform(toInteger)
  @Rule(
    optional((value) =>
      Number.isInteger(value) && (value as number) >= 1 ? null : LIST_FALLOS_MESSAGES.pagina,
    ),
  )
  pagina?: number;

  @Transform(toSearchText)
  @Rule(optional(searchRule))
  buscar?: string;

  @Transform(toIdList)
  @Rule(optional(idListRule))
  palabrasClave?: number[];

  @Rule(optional(fueroRule))
  fuero?: Fuero;

  @Rule(optional(filterDateRule))
  desde?: string;

  @Rule(optional((value, object) => filterDateRule(value, object) ?? rangeRule(value, object)))
  hasta?: string;

  @Transform(toBoolean)
  @Rule(
    optional((value) =>
      typeof value === 'boolean' ? null : LIST_FALLOS_MESSAGES.incluirDesactivados,
    ),
  )
  incluirDesactivados?: boolean;
}
