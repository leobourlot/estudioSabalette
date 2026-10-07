import type { TransformFnParams } from 'class-transformer';
import type { RuleFn } from '../../usuarios/dto/reglas.js';
import { MOVEMENT_TYPES } from '../movimiento.entity.js';
import { isDateInRange, isExistingDate } from '../reglas-movimientos.js';
import { MAX_MOVEMENT_TEXT_LENGTH } from '../validadores/longitudes.js';
import {
  allowedCharactersMessage,
  hasOnlyAllowedCharacters,
  normalizeMovementText,
  textLength,
} from '../validadores/texto-movimiento.js';

/**
 * Mensajes de validación de los DTO de movimientos (plan 003, "Mensajes de 400"). Ninguno
 * repite el valor recibido (RNF de registros).
 */
export const MOVIMIENTO_MESSAGES = {
  fechaRequired: 'Indicá la fecha del movimiento',
  fechaInvalid: 'La fecha no es válida',
  fechaRange: 'La fecha debe estar entre el 01/01/1900 y el 31/12/2099',
  tipo: 'El tipo debe ser escrito presentado, providencia, resolución, sentencia, notificación, audiencia, pericia, oficio u otro',
  descripcionRequired: 'Indicá la descripción del movimiento',
  visible: 'La visibilidad debe ser sí o no',
} as const;

export const DESCRIPCION_LABEL = 'La descripción';
export const TEXTO_CLIENTE_LABEL = 'El texto para el cliente';

// --- Transformaciones (se aplican antes de validar) ---

/** Normaliza el texto (RF-3, RF-4): NFC, saltos de línea como \n y extremos recortados. */
export const toMovementText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? normalizeMovementText(value) : value;

/** Como toMovementText, y el texto vacío pasa a null: el dato queda sin informar (RF-3). */
export const toOptionalMovementText = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') return value;
  const text = normalizeMovementText(value);
  return text === '' ? null : text;
};

// --- Reglas ---

/** Fecha AAAA-MM-DD obligatoria, existente y dentro del rango de RF-5 (RF-6). */
export const fechaRule: RuleFn = (value) => {
  if (value === undefined || value === null || value === '') {
    return MOVIMIENTO_MESSAGES.fechaRequired;
  }
  if (typeof value !== 'string' || !isExistingDate(value)) return MOVIMIENTO_MESSAGES.fechaInvalid;
  return isDateInRange(value) ? null : MOVIMIENTO_MESSAGES.fechaRange;
};

export const tipoRule: RuleFn = (value) =>
  (MOVEMENT_TYPES as readonly unknown[]).includes(value) ? null : MOVIMIENTO_MESSAGES.tipo;

/**
 * Texto del movimiento ya normalizado: largo máximo en caracteres y caracteres permitidos
 * (RF-1, RF-4). Con required, un valor ausente o vacío es un error; sin él, es opcional.
 */
export const movementText =
  (label: string, required?: string): RuleFn =>
  (value) => {
    if (value === undefined || value === null || value === '') return required ?? null;
    if (typeof value !== 'string') return allowedCharactersMessage(label);
    if (textLength(value) > MAX_MOVEMENT_TEXT_LENGTH) {
      return `${label} no puede tener más de ${MAX_MOVEMENT_TEXT_LENGTH} caracteres`;
    }
    return hasOnlyAllowedCharacters(value) ? null : allowedCharactersMessage(label);
  };

export const visibleRule: RuleFn = (value) =>
  typeof value === 'boolean' ? null : MOVIMIENTO_MESSAGES.visible;
