import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './base-de-datos/base-de-datos.module.js';
import { ConfigurationModule } from './configuracion/configuracion.module.js';

@Module({
  imports: [ConfigurationModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
