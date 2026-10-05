import { Transform } from 'class-transformer';
import { optional, Rule } from '../../usuarios/dto/reglas.js';
import type { EstadoCausa, Fuero } from '../causa.entity.js';
import {
  MAX_CARATULA_LENGTH,
  MAX_CASE_NUMBER_LENGTH,
  MAX_COURT_LENGTH,
} from '../validadores/longitudes.js';
import {
  booleanRule,
  CAUSA_MESSAGES,
  causaText,
  estadoRule,
  fueroRule,
  idListRule,
  idRule,
  partiesListRule,
  principalCaseViolation,
  toCausaText,
  toOptionalCausaText,
} from './reglas-causa.js';

const PRINCIPAL_LABEL = 'El número del expediente principal';

/**
 * Alta de una causa (RF-6). Las partes llegan como una lista de objetos sin validar: el
 * service valida cada una con su propio DTO, para crear la causa aunque alguna se rechace
 * (RF-7). Que el responsable y los colaboradores sean integrantes lo controla el service.
 */
export class CreateCausaDto {
  @Transform(toCausaText)
  @Rule(causaText('La carátula', MAX_CARATULA_LENGTH, CAUSA_MESSAGES.caratulaRequired))
  caratula: string;

  @Transform(toOptionalCausaText)
  @Rule(causaText('El número de expediente', MAX_CASE_NUMBER_LENGTH))
  numeroExpediente?: string | null;

  @Transform(toOptionalCausaText)
  @Rule(causaText('El juzgado', MAX_COURT_LENGTH))
  juzgado?: string | null;

  @Rule(fueroRule)
  fuero: Fuero;

  @Rule(optional(estadoRule))
  estado?: EstadoCausa;

  @Rule(optional(booleanRule(CAUSA_MESSAGES.esIncidente)))
  esIncidente?: boolean;

  @Transform(toOptionalCausaText)
  @Rule((value, object) => {
    const format = causaText(PRINCIPAL_LABEL, MAX_CASE_NUMBER_LENGTH)(value, object);
    if (format) return format;
    return principalCaseViolation(object.esIncidente === true, value as string | null);
  })
  expedientePrincipal?: string | null;

  @Rule(idRule(CAUSA_MESSAGES.responsableId))
  responsableId: number;

  @Rule(optional(idListRule(CAUSA_MESSAGES.colaboradorIds)))
  colaboradorIds?: number[];

  @Rule(partiesListRule)
  partes: Record<string, unknown>[];

  @Rule(optional(booleanRule(CAUSA_MESSAGES.confirmation)))
  confirmarExpedienteRepetido?: boolean;
}
