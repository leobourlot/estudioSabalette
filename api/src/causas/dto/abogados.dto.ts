import { Rule } from '../../usuarios/dto/reglas.js';
import { CAUSA_MESSAGES, idListRule, idRule } from './reglas-causa.js';

/**
 * Abogados de una causa (RF-29 a RF-34): reemplaza al responsable y al conjunto de
 * colaboradores. Los que no vienen dejan de figurar. Que sean integrantes, que no estén
 * desactivados si son nuevos y que no se repitan lo controla el service.
 */
export class UpdateLawyersDto {
  @Rule(idRule(CAUSA_MESSAGES.responsableId))
  responsableId: number;

  @Rule(idListRule(CAUSA_MESSAGES.colaboradorIds))
  colaboradorIds: number[];
}
