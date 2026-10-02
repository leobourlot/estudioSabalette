import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './validar-entorno.js';

// Los tests leen .env.test (base de tests); el resto, .env. En Easypanel las variables
// llegan por el entorno del servicio y no hace falta ningún archivo.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: validateEnvironment,
    }),
  ],
})
export class ConfigurationModule {}
