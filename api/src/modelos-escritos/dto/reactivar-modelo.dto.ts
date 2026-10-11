import { optional, Rule } from '../../usuarios/dto/reglas.js';
import { confirmationRule } from './reglas-modelo.js';

/** Reactivación de un modelo (RF-27). `confirmarRepetido` responde la pregunta de título repetido (RF-15). */
export class ReactivateModeloDto {
  @Rule(optional(confirmationRule))
  confirmarRepetido?: boolean;
}
