import { optional, Rule } from '../../usuarios/dto/reglas.js';
import { booleanRule, CAUSA_MESSAGES } from './reglas-causa.js';

/** Reactivación de una causa (RF-42, RF-43): la respuesta a la pregunta de expediente repetido. */
export class ReactivateCausaDto {
  @Rule(optional(booleanRule(CAUSA_MESSAGES.confirmation)))
  confirmarExpedienteRepetido?: boolean;
}
