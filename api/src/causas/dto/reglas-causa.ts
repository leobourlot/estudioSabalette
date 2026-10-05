import type { TransformFnParams } from 'class-transformer';
import type { RuleFn } from '../../usuarios/dto/reglas.js';
import { fitsMaxLength, isBlank } from '../../usuarios/validadores/longitudes.js';
import { CASE_STATUSES, JURISDICTIONS } from '../causa.entity.js';
import { CAUSAS_RULE_MESSAGES } from '../reglas-causas.js';
import {
  allowedCharactersMessage,
  hasOnlyAllowedCharacters,
  normalizeCausaText,
} from '../validadores/texto-causa.js';

/** Mensajes de validación de los DTO de causas (plan 002, "Mensajes de 400"). */
export const CAUSA_MESSAGES = {
  caratulaRequired: 'La carátula es obligatoria',
  fuero: 'El fuero debe ser civil, penal, familia, laboral, federal u otro',
  estado: 'El estado debe ser en trámite, paralizada, archivada o finalizada',
  esIncidente: 'La marca de incidente debe ser true o false',
  responsableId: 'El responsable es obligatorio y debe ser el id de un integrante',
  colaboradorIds: 'Los colaboradores deben ser una lista de ids de integrantes',
  partesList: 'Las partes deben ser una lista',
  parteObject: 'Cada parte debe tener sus datos',
  confirmation: 'La confirmación debe ser true o false',
  missingPrincipal: 'Indicá el número del expediente principal',
  principalWithoutIncident: 'Solo un incidente lleva número de expediente principal',
} as const;

// --- Transformaciones (se aplican antes de validar) ---

/** Recorta y une las tildes combinables (RF-3, RF-4). */
export const toCausaText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? normalizeCausaText(value.trim()) : value;

/** Como toCausaText, y el texto vacío pasa a null: el dato queda sin informar (RF-3). */
export const toOptionalCausaText = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const text = normalizeCausaText(value.trim());
  return text === '' ? null : text;
};

/** Números enteros que llegan como texto en la URL. */
export const toInteger = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

/** "true" y "false" que llegan como texto en la URL. */
export const toBoolean = ({ value }: TransformFnParams): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

// --- Reglas ---

/**
 * Texto de la causa: largo máximo y caracteres permitidos (RF-4, RF-5). Con required, un
 * valor ausente o vacío es un error; sin él, el dato es opcional.
 */
export const causaText =
  (label: string, max: number, required?: string): RuleFn =>
  (value) => {
    if (value === undefined || value === null) return required ?? null;
    if (typeof value !== 'string') return required ?? allowedCharactersMessage(label);
    if (isBlank(value)) return required ?? null;
    if (!fitsMaxLength(value, max)) return `${label} no puede tener más de ${max} caracteres`;
    return hasOnlyAllowedCharacters(value) ? null : allowedCharactersMessage(label);
  };

export const enumRule =
  (values: readonly string[], message: string): RuleFn =>
  (value) =>
    values.includes(value as string) ? null : message;

export const fueroRule = enumRule(JURISDICTIONS, CAUSA_MESSAGES.fuero);
export const estadoRule = enumRule(CASE_STATUSES, CAUSA_MESSAGES.estado);

export const booleanRule =
  (message: string): RuleFn =>
  (value) =>
    typeof value === 'boolean' ? null : message;

const isId = (value: unknown) => Number.isInteger(value) && (value as number) >= 1;

export const idRule =
  (message: string): RuleFn =>
  (value) =>
    isId(value) ? null : message;

export const idListRule =
  (message: string): RuleFn =>
  (value) =>
    Array.isArray(value) && value.every(isId) ? null : message;

/**
 * Lista de partes del alta: solo se exige que sea una lista no vacía de objetos. Cada parte
 * la valida el service por separado, para guardar las válidas e informar el resto (RF-7).
 */
export const partiesListRule: RuleFn = (value) => {
  if (!Array.isArray(value)) return CAUSA_MESSAGES.partesList;
  if (value.length === 0) return CAUSAS_RULE_MESSAGES.lastParty;
  const allObjects = value.every(
    (parte) => typeof parte === 'object' && parte !== null && !Array.isArray(parte),
  );
  return allObjects ? null : CAUSA_MESSAGES.parteObject;
};

/**
 * RF-10: un incidente exige el número del expediente principal, y una causa que no es
 * incidente no lo lleva. Lo usan los DTO y, en una modificación parcial, el service sobre
 * el estado final de la causa.
 */
export function principalCaseViolation(
  esIncidente: boolean,
  expedientePrincipal: string | null | undefined,
): string | null {
  const hasPrincipal = expedientePrincipal !== undefined && expedientePrincipal !== null;
  if (esIncidente && !hasPrincipal) return CAUSA_MESSAGES.missingPrincipal;
  if (!esIncidente && hasPrincipal) return CAUSA_MESSAGES.principalWithoutIncident;
  return null;
}
