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
 * Carga de un modelo (RF-1, RF-13). Los textos llegan convertidos (RF-3), y el texto, con las
 * marcas de variable en la forma del catálogo (RF-8), antes de validarse. Sin fuero, el modelo
 * queda como "otro". La marca de activo no se declara: un modelo nace activo.
 * `confirmarRepetido` responde la pregunta de título repetido (RF-15).
 */
export class CreateModeloDto {
  @Transform(toTitleText)
  @Rule(tituloRule)
  titulo: string;

  @Rule(tipoRule)
  tipo: TipoEscrito;

  @Rule(optional(fueroRule))
  fuero?: Fuero;

  @Transform(toDescriptionText)
  @Rule(descripcionRule)
  descripcion?: string | null;

  @Transform(toModelText)
  @Rule(textoRule)
  texto: string;

  @Rule(optional(confirmationRule))
  confirmarRepetido?: boolean;
}
