import type { TransformFnParams } from 'class-transformer';
import { booleanRule, CAUSA_MESSAGES, causaText, enumRule } from '../../causas/dto/reglas-causa.js';
import { convertText } from '../../jurisprudencia/validadores/texto-fallo.js';
import {
  hasOnlyAllowedCharacters as hasOnlyMovementCharacters,
  textLength,
} from '../../movimientos/validadores/texto-movimiento.js';
import type { RuleFn } from '../../usuarios/dto/reglas.js';
import { TEMPLATE_TYPES } from '../modelo-escrito.entity.js';
import {
  MAX_DESCRIPCION_LENGTH,
  MAX_TEXTO_LENGTH,
  MAX_TITULO_LENGTH,
} from '../validadores/longitudes.js';
import {
  ALLOWED_TEXT_SYMBOLS,
  convertModelText,
  hasOnlyModelTextCharacters,
} from '../validadores/texto-modelo.js';
import { canonicalMarks, hasJoinedMarks, unknownVariables } from '../variables.js';

/** Símbolos de la descripción (RF-4): los del título más ¿ ? ¡ ! %. */
const DESCRIPTION_SYMBOLS = '. , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! %';

/**
 * Mensajes de validación de los DTO de modelos (plan 006, "Mensajes de 400"). Ninguno repite
 * el valor recibido (RNF de registros): tampoco los nombres de las variables que no existen.
 */
export const MODELO_MESSAGES = {
  tituloRequired: 'Indicá el título del modelo',
  tipoRequired: 'Indicá el tipo de escrito',
  tipo: 'El tipo de escrito debe ser demanda, contestación de demanda, escrito de trámite, recurso, oficio, cédula u otro',
  descripcionTooLong: `La descripción no puede tener más de ${MAX_DESCRIPCION_LENGTH} caracteres`,
  descripcionCharacters: `La descripción solo puede tener letras, números, espacios y los símbolos ${DESCRIPTION_SYMBOLS}`,
  textoRequired: 'Indicá el texto del modelo',
  // "50.000", con el punto de miles, como lo fija la spec (RF-6).
  textoTooLong: 'El texto no puede tener más de 50.000 caracteres',
  textoCharacters: `El texto solo puede tener letras, números, espacios, saltos de línea y los símbolos ${ALLOWED_TEXT_SYMBOLS}`,
  joinedMarks: 'Las variables tienen que estar separadas',
  unknownVariables: 'El texto tiene variables que no existen',
} as const;

export const TITULO_LABEL = 'El título';

// --- Transformaciones (se aplican antes de validar) ---

const singleLine = (value: string) => convertText(value, { multilinea: false });

/** Título: conversiones de la spec 005 en una línea (RF-3). */
export const toTitleText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? singleLine(value) : value;

/** Descripción: como el título, y el texto vacío pasa a null (RF-3). */
export const toDescriptionText = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const text = singleLine(value);
  return text === '' ? null : text;
};

/**
 * Texto: conversiones de RF-3 en varias líneas, sin sangría, y con las marcas de variable en
 * la forma del catálogo (RF-8). Una marca que no existe queda como se escribió, para que la
 * rechace la regla.
 */
export const toModelText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? canonicalMarks(convertModelText(value)) : value;

// --- Reglas ---

/** Título ya convertido: obligatorio, hasta 150 caracteres y caracteres de la spec 002 (RF-4). */
export const tituloRule = causaText(
  TITULO_LABEL,
  MAX_TITULO_LENGTH,
  MODELO_MESSAGES.tituloRequired,
);

const tipoEnumRule = enumRule(TEMPLATE_TYPES, MODELO_MESSAGES.tipo);

/** Tipo de escrito: obligatorio y de la lista cerrada (RF-1). */
export const tipoRule: RuleFn = (value, object) =>
  value === undefined || value === null || value === ''
    ? MODELO_MESSAGES.tipoRequired
    : tipoEnumRule(value, object);

/**
 * Descripción ya convertida: opcional (null la borra), hasta 500 caracteres y con los
 * caracteres de la spec 003. Ya es de una sola línea, así que no tiene saltos de línea (RF-4).
 */
export const descripcionRule: RuleFn = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return MODELO_MESSAGES.descripcionCharacters;
  if (textLength(value) > MAX_DESCRIPCION_LENGTH) return MODELO_MESSAGES.descripcionTooLong;
  return hasOnlyMovementCharacters(value) ? null : MODELO_MESSAGES.descripcionCharacters;
};

/**
 * Texto ya convertido, en el orden del plan: obligatorio, largo, caracteres, variables pegadas
 * (RF-7) y variables que no existen (RF-10). El largo va primero, para no evaluar las demás
 * reglas sobre un texto enorme.
 */
export const textoRule: RuleFn = (value) => {
  if (value === undefined || value === null || value === '') return MODELO_MESSAGES.textoRequired;
  if (typeof value !== 'string') return MODELO_MESSAGES.textoCharacters;
  if (textLength(value) > MAX_TEXTO_LENGTH) return MODELO_MESSAGES.textoTooLong;
  if (!hasOnlyModelTextCharacters(value)) return MODELO_MESSAGES.textoCharacters;
  if (hasJoinedMarks(value)) return MODELO_MESSAGES.joinedMarks;
  return unknownVariables(value).length > 0 ? MODELO_MESSAGES.unknownVariables : null;
};

export const confirmationRule = booleanRule(CAUSA_MESSAGES.confirmation);
