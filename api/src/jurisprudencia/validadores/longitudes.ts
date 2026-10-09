import {
  MAX_CARATULA_LENGTH,
  MAX_CASE_NUMBER_LENGTH,
  MAX_COURT_LENGTH,
} from '../../causas/validadores/longitudes.js';

/** Largos máximos de los datos de un fallo, en caracteres (spec 005, RF-1). */
export { MAX_CARATULA_LENGTH };

/** Tribunal: el mismo largo que el juzgado de una causa. */
export const MAX_TRIBUNAL_LENGTH = MAX_COURT_LENGTH;

/** Número de expediente o de registro: el mismo largo que el número de una causa. */
export const MAX_NUMERO_LENGTH = MAX_CASE_NUMBER_LENGTH;

export const MAX_SUMARIO_LENGTH = 5000;

export const MAX_KEYWORD_LENGTH = 50;

/** Cantidad máxima de palabras clave de un fallo (RF-1, RF-14). */
export const MAX_KEYWORDS = 10;

export const MAX_LINK_LENGTH = 500;

/** Texto del buscador (RF-24). */
export const MAX_SEARCH_LENGTH = 100;
