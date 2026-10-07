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
 * Carga de un movimiento (RF-1, RF-8). Sin `visible`, nace no visible. La causa sale de la
 * ruta, y la marca de anulado no se declara: un movimiento nace sin anular.
 */
export class CreateMovimientoDto {
  @Rule(fechaRule)
  fecha: string;

  @Rule(tipoRule)
  tipo: TipoMovimiento;

  @Transform(toMovementText)
  @Rule(movementText(DESCRIPCION_LABEL, MOVIMIENTO_MESSAGES.descripcionRequired))
  descripcion: string;

  @Transform(toOptionalMovementText)
  @Rule(movementText(TEXTO_CLIENTE_LABEL))
  textoCliente?: string | null;

  @Rule(optional(visibleRule))
  visible?: boolean;
}
