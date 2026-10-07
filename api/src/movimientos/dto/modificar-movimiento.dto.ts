import { Transform } from 'class-transformer';
import { optional, Rule } from '../../usuarios/dto/reglas.js';
import type { TipoMovimiento } from '../movimiento.entity.js';
import {
  DESCRIPCION_LABEL,
  fechaRule,
  MOVIMIENTO_MESSAGES,
  movementText,
  TEXTO_CLIENTE_LABEL,
  tipoRule,
  toMovementText,
  toOptionalMovementText,
  visibleRule,
} from './reglas-movimiento.js';

/**
 * Modificación parcial de un movimiento (RF-11, RF-14): los campos ausentes no cambian, y
 * null o vacío borra el texto para el cliente. La causa y la marca de anulado no se
 * declaran a propósito: un movimiento no cambia de causa (RF-12) y se anula o restaura con
 * sus propias acciones. Enviarlos responde "El campo … no está permitido".
 */
export class UpdateMovimientoDto {
  @Rule(optional(fechaRule))
  fecha?: string;

  @Rule(optional(tipoRule))
  tipo?: TipoMovimiento;

  @Transform(toMovementText)
  @Rule(optional(movementText(DESCRIPCION_LABEL, MOVIMIENTO_MESSAGES.descripcionRequired)))
  descripcion?: string;

  @Transform(toOptionalMovementText)
  @Rule(movementText(TEXTO_CLIENTE_LABEL))
  textoCliente?: string | null;

  @Rule(optional(visibleRule))
  visible?: boolean;
}
