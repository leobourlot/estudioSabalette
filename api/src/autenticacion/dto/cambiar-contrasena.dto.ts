import { IsString, MaxLength } from 'class-validator';

// Las reglas de la contraseña nueva (RF-39) las aplica PasswordsService, con los mensajes
// de la spec. Acá solo se exige que vengan los dos campos y se acota su tamaño.
export class ChangePasswordDto {
  @IsString({ message: 'La contraseña actual es obligatoria' })
  @MaxLength(256, { message: 'La contraseña actual es demasiado larga' })
  contrasenaActual: string;

  @IsString({ message: 'La contraseña nueva es obligatoria' })
  @MaxLength(256, { message: 'La contraseña no puede tener más de 64 caracteres' })
  contrasenaNueva: string;
}
