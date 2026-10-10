import { Transform } from 'class-transformer';
import { fueroRule } from '../../causas/dto/reglas-causa.js';
import type { Fuero } from '../../causas/causa.entity.js';
import { optional, Rule } from '../../usuarios/dto/reglas.js';
import {
  caratulaRule,
  confirmationRule,
  fechaFalloRule,
  keywordsRule,
  linkRule,
  numeroRule,
  sumarioRule,
  toKeywords,
  toLink,
  toOptionalSingleLineText,
  toSingleLineText,
  toSumarioText,
  tribunalRule,
} from './reglas-fallo.js';

/**
 * Carga de un fallo (RF-1, RF-16). Los textos llegan convertidos (RF-3) antes de validarse.
 * La marca de activo no se declara: un fallo nace activo. `confirmarRepetido` responde la
 * pregunta de repetido (RF-18).
 */
export class CreateFalloDto {
  @Transform(toSingleLineText)
  @Rule(caratulaRule)
  caratula: string;

  @Transform(toSingleLineText)
  @Rule(tribunalRule)
  tribunal: string;

  @Rule(fueroRule)
  fuero: Fuero;

  @Rule(fechaFalloRule)
  fecha: string;

  @Transform(toOptionalSingleLineText)
  @Rule(numeroRule)
  numero?: string | null;

  @Transform(toSumarioText)
  @Rule(sumarioRule)
  sumario: string;

  @Transform(toKeywords)
  @Rule(keywordsRule)
  palabrasClave: string[];

  @Transform(toLink)
  @Rule(linkRule)
  enlace?: string | null;

  @Rule(optional(confirmationRule))
  confirmarRepetido?: boolean;
}
