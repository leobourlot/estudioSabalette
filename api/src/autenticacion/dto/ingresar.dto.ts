import { IsString, MaxLength } from 'class-validator';

// El formato del email no se valida acá: un email mal escrito simplemente no existe y
// responde el 401 genérico de RF-9. Los máximos solo evitan cuerpos desmesurados.
export class LoginDto {
  @IsString({ message: 'El email es obligatorio' })
  @MaxLength(254, { message: 'El email no puede tener más de 254 caracteres' })
  email: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @MaxLength(256, { message: 'La contraseña es demasiado larga' })
  contrasena: string;
}
