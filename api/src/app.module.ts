import { Module } from '@nestjs/common';
import { AuthenticationModule } from './autenticacion/autenticacion.module.js';
import { DatabaseModule } from './base-de-datos/base-de-datos.module.js';
import { ConfigurationModule } from './configuracion/configuracion.module.js';
import { UsersModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [ConfigurationModule, DatabaseModule, AuthenticationModule, UsersModule],
})
export class AppModule {}
