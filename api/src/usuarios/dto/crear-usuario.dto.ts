import { Transform, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import type { TipoPersona } from '../cliente.entity.js';
import type { Rol } from '../usuario.entity.js';
import { isValidCuit, isValidDni } from '../validadores/documentos.js';
import { fitsMaxLength, MAX_PHONE_LENGTH, MAX_TEXT_LENGTH } from '../validadores/longitudes.js';
import {
  emailRule,
  onlyForPersonType,
  optionalText,
  personTypeRule,
  requiredText,
  rolRule,
  Rule,
  temporaryPasswordRule,
  toDocumentNumber,
  toNormalizedEmail,
  trimOptionalText,
  trimText,
} from './reglas.js';

/** Datos de cliente en el alta (RF-3). DNI para personas físicas; CUIT y razón social para jurídicas. */
export class CreateClientDataDto {
  @Rule(personTypeRule)
  tipoPersona: TipoPersona;

  @Transform(toDocumentNumber)
  @Rule(
    onlyForPersonType(
      'fisica',
      {
        required: 'El DNI es obligatorio para personas físicas',
        forbidden: 'El DNI solo corresponde a personas físicas',
      },
      (value) => (isValidDni(String(value)) ? null : 'El DNI debe tener 7 u 8 dígitos'),
    ),
  )
  dni?: string;

  @Transform(toDocumentNumber)
  @Rule(
    onlyForPersonType(
      'juridica',
      {
        required: 'El CUIT es obligatorio para personas jurídicas',
        forbidden: 'El CUIT solo corresponde a personas jurídicas',
      },
      (value) =>
        isValidCuit(String(value))
          ? null
          : 'El CUIT debe tener 11 dígitos y un dígito verificador válido',
    ),
  )
  cuit?: string;

  @Transform(trimText)
  @Rule(
    onlyForPersonType(
      'juridica',
      {
        required: 'La razón social es obligatoria para personas jurídicas',
        forbidden: 'La razón social solo corresponde a personas jurídicas',
      },
      (value) =>
        fitsMaxLength(String(value), MAX_TEXT_LENGTH)
          ? null
          : `La razón social no puede tener más de ${MAX_TEXT_LENGTH} caracteres`,
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
 * Alta de una cuenta (RF-21, RF-22). En personas jurídicas, nombre y apellido son los de la
 * persona de contacto. Las reglas de la contraseña temporal (RF-39) las aplica el service.
 */
export class CreateUserDto {
  @Rule(rolRule)
  rol: Rol;

  @Transform(toNormalizedEmail)
  @Rule(emailRule)
  email: string;

  @Transform(trimText)
  @Rule(
    requiredText(
      {
        required: 'El nombre es obligatorio',
        tooLong: `El nombre no puede tener más de ${MAX_TEXT_LENGTH} caracteres`,
      },
      MAX_TEXT_LENGTH,
    ),
  )
  nombre: string;

  @Transform(trimText)
  @Rule(
    requiredText(
      {
        required: 'El apellido es obligatorio',
        tooLong: `El apellido no puede tener más de ${MAX_TEXT_LENGTH} caracteres`,
      },
      MAX_TEXT_LENGTH,
    ),
  )
  apellido: string;

  @Rule(temporaryPasswordRule)
  contrasenaTemporal: string;

  @Rule((value, object) => {
    const hasClientData = value !== undefined && value !== null;
    if (object.rol === 'cliente') {
      return hasClientData ? null : 'Los datos del cliente son obligatorios para el rol cliente';
    }
    return hasClientData ? 'Solo las cuentas de clientes llevan datos de cliente' : null;
  })
  @ValidateNested()
  @Type(() => CreateClientDataDto)
  cliente?: CreateClientDataDto;
}
