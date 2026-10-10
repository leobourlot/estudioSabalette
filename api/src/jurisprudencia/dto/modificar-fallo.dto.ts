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
 * Modificación parcial de un fallo (RF-17): los campos ausentes no cambian, y null o vacío
 * borra el número o el enlace. `palabrasClave` reemplaza la lista completa. La marca de
 * activo no se declara a propósito: solo cambia con desactivar y reactivar (RF-29, RF-31).
 * Enviarla responde "El campo … no está permitido".
 */
export class UpdateFalloDto {
  @Transform(toSingleLineText)
  @Rule(optional(caratulaRule))
  caratula?: string;

  @Transform(toSingleLineText)
  @Rule(optional(tribunalRule))
  tribunal?: string;

  @Rule(optional(fueroRule))
  fuero?: Fuero;

  @Rule(optional(fechaFalloRule))
  fecha?: string;

  @Transform(toOptionalSingleLineText)
  @Rule(numeroRule)
  numero?: string | null;

  @Transform(toSumarioText)
  @Rule(optional(sumarioRule))
  sumario?: string;

  @Transform(toKeywords)
  @Rule(optional(keywordsRule))
  palabrasClave?: string[];

  @Transform(toLink)
  @Rule(linkRule)
  enlace?: string | null;

  @Rule(optional(confirmationRule))
  confirmarRepetido?: boolean;
}
