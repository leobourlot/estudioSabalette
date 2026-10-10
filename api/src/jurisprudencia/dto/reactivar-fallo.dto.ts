import { optional, Rule } from '../../usuarios/dto/reglas.js';
import { confirmationRule } from './reglas-fallo.js';

/** Reactivación de un fallo (RF-31). `confirmarRepetido` responde la pregunta de repetido (RF-18). */
export class ReactivateFalloDto {
  @Rule(optional(confirmationRule))
  confirmarRepetido?: boolean;
}
