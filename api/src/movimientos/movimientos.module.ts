import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Causa } from '../causas/causa.entity.js';
import { CausasModule } from '../causas/causas.module.js';
import { CambioMovimiento } from './cambio-movimiento.entity.js';
import { Movimiento } from './movimiento.entity.js';
import { MovimientosController } from './movimientos.controller.js';
import { MovimientosService } from './movimientos.service.js';

/** Importa CausasModule para usar ClientLinkService, el vínculo cliente-causa (RF-30). */
@Module({
  imports: [TypeOrmModule.forFeature([Movimiento, CambioMovimiento, Causa]), CausasModule],
  controllers: [MovimientosController],
  providers: [MovimientosService],
})
export class MovimientosModule {}
