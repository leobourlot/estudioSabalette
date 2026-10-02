import { Transform, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import type { Rol } from '../usuario.entity.js';
import { MAX_PHONE_LENGTH, MAX_TEXT_LENGTH } from '../validadores/longitudes.js';
import {
  emailRule,
  optional,
  optionalText,
  requiredText,
  rolRule,
  Rule,
  toNormalizedEmail,
  trimOptionalText,
  trimText,
} from './reglas.js';

/**
 * Datos de cliente modificables. DNI, CUIT y tipo de persona no se declaran a propósito:
 * no se pueden modificar (RF-7) y enviarlos responde "El campo cliente.dni no está permitido".
 * Que la razón social solo corresponda a personas jurídicas lo controla el service.
 */
export class UpdateClientDataDto {
  @Transform(trimText)
  @Rule(
    optional(
      requiredText(
        {
          required: 'La razón social es obligatoria para personas jurídicas',
          tooLong: `La razón social no puede tener más de ${MAX_TEXT_LENGTH} caracteres`,
        },
        MAX_TEXT_LENGTH,
      ),
    ),
  )
  razonSocial?: string;

  @Transform(trimOptionalText)
  @Rule(
    optionalText(
      `El teléfono no puede tener más de ${MAX_PHONE_LENGTH} caracteres`,
      MAX_PHONE_LENGTH,
    ),
  )
  telefono?: string | null;

  @Transform(trimOptionalText)
  @Rule(
    optionalText(
      `El domicilio no puede tener más de ${MAX_TEXT_LENGTH} caracteres`,
      MAX_TEXT_LENGTH,
    ),
  )
  domicilio?: string | null;
}

/**
 * Modificación parcial de una cuenta (RF-27, RF-28). Los campos ausentes no cambian.
 * Qué roles se pueden asignar y a quién lo controla el service.
 */
export class UpdateUserDto {
  @Transform(toNormalizedEmail)
  @Rule(optional(emailRule))
  email?: string;

  @Transform(trimText)
  @Rule(
    optional(
      requiredText(
        {
          required: 'El nombre es obligatorio',
          tooLong: `El nombre no puede tener más de ${MAX_TEXT_LENGTH} caracteres`,
        },
        MAX_TEXT_LENGTH,
      ),
    ),
  )
  nombre?: string;

  @Transform(trimText)
  @Rule(
    optional(
      requiredText(
        {
          required: 'El apellido es obligatorio',
          tooLong: `El apellido no puede tener más de ${MAX_TEXT_LENGTH} caracteres`,
        },
        MAX_TEXT_LENGTH,
      ),
    ),
  )
  apellido?: string;

  @Rule(optional(rolRule))
  rol?: Rol;

  @Rule(
    optional((value) => (value !== null ? null : 'Los datos del cliente no pueden quedar vacíos')),
  )
  @ValidateNested()
  @Type(() => UpdateClientDataDto)
  cliente?: UpdateClientDataDto;
}
