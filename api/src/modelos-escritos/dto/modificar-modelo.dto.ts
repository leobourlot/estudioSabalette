import { Transform } from 'class-transformer';
import { fueroRule } from '../../causas/dto/reglas-causa.js';
import type { Fuero } from '../../causas/causa.entity.js';
import { optional, Rule } from '../../usuarios/dto/reglas.js';
import type { TipoEscrito } from '../modelo-escrito.entity.js';
import {
  confirmationRule,
  descripcionRule,
  textoRule,
  tipoRule,
  tituloRule,
  toDescriptionText,
  toModelText,
  toTitleText,
} from './reglas-modelo.js';

/**
 * Modificación parcial de un modelo (RF-14): los campos ausentes no cambian, y null o vacío
 * borra la descripción. La marca de activo no se declara a propósito: solo cambia con
 * desactivar y reactivar (RF-25, RF-27). Enviarla responde "El campo … no está permitido".
 */
export class UpdateModeloDto {
  @Transform(toTitleText)
  @Rule(optional(tituloRule))
  titulo?: string;

  @Rule(optional(tipoRule))
  tipo?: TipoEscrito;

  @Rule(optional(fueroRule))
  fuero?: Fuero;

  @Transform(toDescriptionText)
  @Rule(descripcionRule)
  descripcion?: string | null;

  @Transform(toModelText)
  @Rule(optional(textoRule))
  texto?: string;

  @Rule(optional(confirmationRule))
  confirmarRepetido?: boolean;
}
