import { Transform, type TransformFnParams } from 'class-transformer';
import { fueroRule, toBoolean, toInteger } from '../../causas/dto/reglas-causa.js';
import type { Fuero } from '../../causas/causa.entity.js';
import { convertText } from '../../jurisprudencia/validadores/texto-fallo.js';
import { textLength } from '../../movimientos/validadores/texto-movimiento.js';
import { optional, Rule, type RuleFn } from '../../usuarios/dto/reglas.js';
import type { TipoEscrito } from '../modelo-escrito.entity.js';
import { MAX_SEARCH_LENGTH } from '../validadores/longitudes.js';
import { hasOnlyModelTextCharacters } from '../validadores/texto-modelo.js';
import { tipoRule } from './reglas-modelo.js';

export const LIST_MODELOS_MESSAGES = {
  pagina: 'La página debe ser un número entero mayor o igual a 1',
  buscarCharacters: 'La búsqueda tiene caracteres no permitidos',
  buscarTooLong: `La búsqueda puede tener hasta ${MAX_SEARCH_LENGTH} caracteres`,
  incluirDesactivados: 'El filtro incluirDesactivados debe ser true o false',
} as const;

/**
 * Texto de búsqueda (RF-21): las conversiones de RF-3 en una línea. Vacío o con solo espacios
 * equivale a no haber buscado nada.
 */
const toSearchText = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const text = convertText(value, { multilinea: false });
  return text === '' ? undefined : text;
};

/**
 * Búsqueda ya convertida: los caracteres del texto de un modelo, que incluyen @, sin saltos de
 * línea, y hasta 100 (RF-21).
 */
const searchRule: RuleFn = (value) => {
  if (typeof value !== 'string') return LIST_MODELOS_MESSAGES.buscarCharacters;
  if (textLength(value) > MAX_SEARCH_LENGTH) return LIST_MODELOS_MESSAGES.buscarTooLong;
  return hasOnlyModelTextCharacters(value) && !value.includes('\n')
    ? null
    : LIST_MODELOS_MESSAGES.buscarCharacters;
};

/** Parámetros del listado de modelos (RF-18, RF-21, RF-22). */
export class ListModelosQueryDto {
  @Transform(toInteger)
  @Rule(
    optional((value) =>
      Number.isInteger(value) && (value as number) >= 1 ? null : LIST_MODELOS_MESSAGES.pagina,
    ),
  )
  pagina?: number;

  @Transform(toSearchText)
  @Rule(optional(searchRule))
  buscar?: string;

  @Rule(optional(tipoRule))
  tipo?: TipoEscrito;

  // Con un fuero, el listado suma los modelos de fuero "otro"; con "otro", solo esos (RF-22).
  @Rule(optional(fueroRule))
  fuero?: Fuero;

  @Transform(toBoolean)
  @Rule(
    optional((value) =>
      typeof value === 'boolean' ? null : LIST_MODELOS_MESSAGES.incluirDesactivados,
    ),
  )
  incluirDesactivados?: boolean;
}
