import { IsString, MaxLength } from 'class-validator';

// El formato del DNI o CUIT no se valida acá: uno mal escrito simplemente no corresponde a
// ninguna cuenta y responde el 401 genérico de RF-9. Los máximos solo evitan cuerpos
// desmesurados.
export class LoginDto {
  @IsString({ message: 'El DNI o CUIT es obligatorio' })
  @MaxLength(32, { message: 'El DNI o CUIT no puede tener más de 32 caracteres' })
  documento: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @MaxLength(256, { message: 'La contraseña es demasiado larga' })
  contrasena: string;
}
