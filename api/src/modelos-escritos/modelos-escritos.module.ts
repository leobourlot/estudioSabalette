import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Causa } from '../causas/causa.entity.js';
import { ModeloEscrito } from './modelo-escrito.entity.js';
import { ModelosEscritosController } from './modelos-escritos.controller.js';
import { ModelosEscritosService } from './modelos-escritos.service.js';

/**
 * Modelos de escritos del estudio (plan 006). No exporta nada a propósito: ningún otro módulo,
 * en particular el portal, puede llegar a los modelos ni a los escritos completados sin cambiar
 * este módulo a la vista (RF-52). Lee las causas con su propio repositorio, como el portal, así
 * que CausasModule no cambia.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ModeloEscrito, Causa])],
  controllers: [ModelosEscritosController],
  providers: [ModelosEscritosService],
})
export class ModelosEscritosModule {}
