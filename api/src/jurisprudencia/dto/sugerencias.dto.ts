import { Transform, type TransformFnParams } from 'class-transformer';
import { hasOnlyAllowedCharacters as hasOnlyCausaCharacters } from '../../causas/validadores/texto-causa.js';
import { textLength } from '../../movimientos/validadores/texto-movimiento.js';
import { optional, Rule, type RuleFn } from '../../usuarios/dto/reglas.js';
import { MAX_KEYWORD_LENGTH } from '../validadores/longitudes.js';
import { convertText } from '../validadores/texto-fallo.js';

/** Las sugerencias son para cargar un fallo (RF-13) o para el filtro del listado (RF-25). */
export const SUGGESTION_TARGETS = ['carga', 'filtro'] as const;
export type DestinoSugerencias = (typeof SUGGESTION_TARGETS)[number];

/** Mínimo de caracteres escritos para sugerir (RF-13). */
export const MIN_SUGGESTION_LENGTH = 2;

export const SUGGESTION_MESSAGES = {
  buscarTooShort: `Escribí al menos ${MIN_SUGGESTION_LENGTH} caracteres`,
  buscarCharacters: 'La búsqueda tiene caracteres no permitidos',
  buscarTooLong: `La búsqueda de palabras clave puede tener hasta ${MAX_KEYWORD_LENGTH} caracteres`,
  para: 'El destino de las sugerencias debe ser carga o filtro',
} as const;

const toKeywordSearch = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? convertText(value, { multilinea: false }) : value;

/** Lo escrito, ya convertido: entre 2 y 50 caracteres permitidos en una palabra clave. */
const buscarRule: RuleFn = (value) => {
  if (typeof value !== 'string' || textLength(value) < MIN_SUGGESTION_LENGTH) {
    return SUGGESTION_MESSAGES.buscarTooShort;
  }
  if (textLength(value) > MAX_KEYWORD_LENGTH) return SUGGESTION_MESSAGES.buscarTooLong;
  return hasOnlyCausaCharacters(value) ? null : SUGGESTION_MESSAGES.buscarCharacters;
};

/** Parámetros de las sugerencias de palabras clave (RF-13, RF-25). Sin `para`, son para la carga. */
export class SuggestionsQueryDto {
  @Transform(toKeywordSearch)
  @Rule(buscarRule)
  buscar: string;

  @Rule(
    optional((value) =>
      (SUGGESTION_TARGETS as readonly unknown[]).includes(value) ? null : SUGGESTION_MESSAGES.para,
    ),
  )
  para?: DestinoSugerencias;
}
