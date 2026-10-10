import type { TransformFnParams } from 'class-transformer';
import { booleanRule, CAUSA_MESSAGES, causaText } from '../../causas/dto/reglas-causa.js';
import {
  allowedCharactersMessage as causaCharactersMessage,
  hasOnlyAllowedCharacters as hasOnlyCausaCharacters,
} from '../../causas/validadores/texto-causa.js';
import { isExistingDate, todayInBuenosAires } from '../../movimientos/reglas-movimientos.js';
import {
  allowedCharactersMessage as movementCharactersMessage,
  hasOnlyAllowedCharacters as hasOnlyMovementCharacters,
  textLength,
} from '../../movimientos/validadores/texto-movimiento.js';
import type { RuleFn } from '../../usuarios/dto/reglas.js';
import { MIN_FALLO_DATE, uniqueKeywords } from '../reglas-jurisprudencia.js';
import { linkViolation } from '../validadores/enlace.js';
import {
  MAX_CARATULA_LENGTH,
  MAX_KEYWORD_LENGTH,
  MAX_KEYWORDS,
  MAX_LINK_LENGTH,
  MAX_NUMERO_LENGTH,
  MAX_SUMARIO_LENGTH,
  MAX_TRIBUNAL_LENGTH,
} from '../validadores/longitudes.js';
import { convertText } from '../validadores/texto-fallo.js';

/**
 * Mensajes de validación de los DTO de jurisprudencia (plan 005, "Mensajes de 400").
 * Ninguno repite el valor recibido (RNF de registros).
 */
export const FALLO_MESSAGES = {
  caratulaRequired: 'La carátula es obligatoria',
  tribunalRequired: 'Indicá el tribunal',
  fechaRequired: 'Indicá la fecha del fallo',
  fechaInvalid: 'La fecha no es válida',
  fechaBeforeMin: 'La fecha no puede ser anterior al 01/01/1800',
  fechaFuture: 'La fecha del fallo no puede ser posterior a hoy',
  sumarioRequired: 'Indicá el sumario del fallo',
  sumarioTooLong: `El sumario no puede tener más de ${MAX_SUMARIO_LENGTH} caracteres`,
  keywordsList: 'Las palabras clave deben ser una lista de textos',
  keywordsRequired: 'Indicá al menos una palabra clave',
  keywordsMax: `Un fallo puede tener hasta ${MAX_KEYWORDS} palabras clave`,
  keywordEmpty: 'La palabra clave no puede quedar vacía',
  keywordTooLong: `Cada palabra clave puede tener hasta ${MAX_KEYWORD_LENGTH} caracteres`,
  linkScheme: 'El enlace debe empezar con https://',
  linkFormat: 'El enlace tiene un formato o caracteres no permitidos',
  linkTooLong: `El enlace no puede tener más de ${MAX_LINK_LENGTH} caracteres`,
} as const;

export const CARATULA_LABEL = 'La carátula';
export const TRIBUNAL_LABEL = 'El tribunal';
export const NUMERO_LABEL = 'El número';
export const SUMARIO_LABEL = 'El sumario';
export const KEYWORD_LABEL = 'La palabra clave';

// --- Transformaciones (se aplican antes de validar) ---

const singleLine = (value: string) => convertText(value, { multilinea: false });

/** Carátula y tribunal: conversiones de RF-3 en una línea. */
export const toSingleLineText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? singleLine(value) : value;

/** Número: como toSingleLineText, y el texto vacío pasa a null (RF-4). */
export const toOptionalSingleLineText = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const text = singleLine(value);
  return text === '' ? null : text;
};

/** Sumario: conversiones de RF-3 en varias líneas. */
export const toSumarioText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? convertText(value, { multilinea: true }) : value;

/**
 * Palabras clave: cada una convertida en una línea, y sin repetidas por comparación
 * flexible, así una repetida cuenta una sola vez para el máximo (RF-14). Si la lista trae
 * algo que no es texto, queda igual para que la rechace la regla.
 */
export const toKeywords = ({ value }: TransformFnParams): unknown => {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) return value;
  return uniqueKeywords((value as string[]).map(singleLine));
};

/** Enlace: solo se recortan los extremos, sin las conversiones de RF-3 (RF-6). Vacío pasa a null. */
export const toLink = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text === '' ? null : text;
};

// --- Reglas ---

/** Carátula, tribunal y número: largo y caracteres de la spec 002 (RF-4). */
export const caratulaRule = causaText(
  CARATULA_LABEL,
  MAX_CARATULA_LENGTH,
  FALLO_MESSAGES.caratulaRequired,
);
export const tribunalRule = causaText(
  TRIBUNAL_LABEL,
  MAX_TRIBUNAL_LENGTH,
  FALLO_MESSAGES.tribunalRequired,
);
export const numeroRule = causaText(NUMERO_LABEL, MAX_NUMERO_LENGTH);

/** Fecha AAAA-MM-DD obligatoria, existente y entre el 01/01/1800 y hoy en Buenos Aires (RF-7, RF-8). */
export const fechaFalloRule: RuleFn = (value) => {
  if (value === undefined || value === null || value === '') return FALLO_MESSAGES.fechaRequired;
  if (typeof value !== 'string' || !isExistingDate(value)) return FALLO_MESSAGES.fechaInvalid;
  if (value < MIN_FALLO_DATE) return FALLO_MESSAGES.fechaBeforeMin;
  return value > todayInBuenosAires(new Date()) ? FALLO_MESSAGES.fechaFuture : null;
};

/** Sumario ya convertido: obligatorio, hasta 5.000 caracteres y caracteres de la spec 003 (RF-5). */
export const sumarioRule: RuleFn = (value) => {
  if (value === undefined || value === null || value === '') return FALLO_MESSAGES.sumarioRequired;
  if (typeof value !== 'string') return movementCharactersMessage(SUMARIO_LABEL);
  if (textLength(value) > MAX_SUMARIO_LENGTH) return FALLO_MESSAGES.sumarioTooLong;
  return hasOnlyMovementCharacters(value) ? null : movementCharactersMessage(SUMARIO_LABEL);
};

/** Palabras clave ya convertidas y sin repetidas: entre 1 y 10, cada una válida (RF-10, RF-14). */
export const keywordsRule: RuleFn = (value) => {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return FALLO_MESSAGES.keywordsList;
  }
  const keywords = value as string[];
  if (keywords.length === 0) return FALLO_MESSAGES.keywordsRequired;
  if (keywords.some((keyword) => keyword === '')) return FALLO_MESSAGES.keywordEmpty;
  if (keywords.length > MAX_KEYWORDS) return FALLO_MESSAGES.keywordsMax;
  if (keywords.some((keyword) => textLength(keyword) > MAX_KEYWORD_LENGTH)) {
    return FALLO_MESSAGES.keywordTooLong;
  }
  return keywords.every(hasOnlyCausaCharacters) ? null : causaCharactersMessage(KEYWORD_LABEL);
};

/** Enlace opcional: null lo borra; si viene, cumple RF-6. */
export const linkRule: RuleFn = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return FALLO_MESSAGES.linkFormat;
  // El largo primero, para no evaluar las expresiones sobre un texto enorme.
  if (textLength(value) > MAX_LINK_LENGTH) return FALLO_MESSAGES.linkTooLong;
  const violation = linkViolation(value);
  if (violation === 'esquema') return FALLO_MESSAGES.linkScheme;
  return violation === 'formato' ? FALLO_MESSAGES.linkFormat : null;
};

export const confirmationRule = booleanRule(CAUSA_MESSAGES.confirmation);
