import { Module } from '@nestjs/common';
import { AuthenticationModule } from './autenticacion/autenticacion.module.js';
import { DatabaseModule } from './base-de-datos/base-de-datos.module.js';
import { ConfigurationModule } from './configuracion/configuracion.module.js';

@Module({
  imports: [ConfigurationModule, DatabaseModule, AuthenticationModule],
})
export class AppModule {}
