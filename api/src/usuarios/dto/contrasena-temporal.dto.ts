import { Rule, temporaryPasswordRule } from './reglas.js';

/** Contraseña temporal para reactivar una cuenta o restablecer su contraseña (RF-30, RF-33). */
export class TemporaryPasswordDto {
  @Rule(temporaryPasswordRule)
  contrasenaTemporal: string;
}
