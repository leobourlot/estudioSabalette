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
  principalCaseViolation,
  toCausaText,
  toOptionalCausaText,
} from './reglas-causa.js';

const PRINCIPAL_LABEL = 'El número del expediente principal';

/**
 * Modificación parcial de los datos de una causa (RF-11): los campos ausentes no cambian y
 * null borra un opcional. Activar o desactivar, los abogados y las partes no se declaran a
 * propósito: tienen sus propias acciones, y enviarlos responde "El campo … no está permitido".
 */
export class UpdateCausaDto {
  @Transform(toCausaText)
  @Rule(optional(causaText('La carátula', MAX_CARATULA_LENGTH, CAUSA_MESSAGES.caratulaRequired)))
  caratula?: string;

  @Transform(toOptionalCausaText)
  @Rule(causaText('El número de expediente', MAX_CASE_NUMBER_LENGTH))
  numeroExpediente?: string | null;

  @Transform(toOptionalCausaText)
  @Rule(causaText('El juzgado', MAX_COURT_LENGTH))
  juzgado?: string | null;

  @Rule(optional(fueroRule))
  fuero?: Fuero;

  @Rule(optional(estadoRule))
  estado?: EstadoCausa;

  @Rule(optional(booleanRule(CAUSA_MESSAGES.esIncidente)))
  esIncidente?: boolean;

  /**
   * Solo se cruza con la marca de incidente si el cuerpo trae los dos datos. Si falta alguno,
   * el service controla RF-10 sobre el estado final de la causa.
   */
  @Transform(toOptionalCausaText)
  @Rule((value, object) => {
    const format = causaText(PRINCIPAL_LABEL, MAX_CASE_NUMBER_LENGTH)(value, object);
    if (format) return format;
    if (value === undefined || typeof object.esIncidente !== 'boolean') return null;
    return principalCaseViolation(object.esIncidente, value as string | null);
  })
  expedientePrincipal?: string | null;

  @Rule(optional(booleanRule(CAUSA_MESSAGES.confirmation)))
  confirmarExpedienteRepetido?: boolean;
}
