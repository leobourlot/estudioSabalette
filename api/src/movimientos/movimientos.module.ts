import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Causa } from '../causas/causa.entity.js';
import { CausasModule } from '../causas/causas.module.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { CambioMovimiento } from './cambio-movimiento.entity.js';
import { Movimiento } from './movimiento.entity.js';
import { MovimientosController } from './movimientos.controller.js';
import { MovimientosService } from './movimientos.service.js';
import { ClientVisibilityService } from './visibilidad-cliente.service.js';

/** Importa CausasModule para usar ClientLinkService, el vínculo cliente-causa (RF-30). */
@Module({
  imports: [TypeOrmModule.forFeature([Movimiento, CambioMovimiento, Causa, Usuario]), CausasModule],
  controllers: [MovimientosController],
  providers: [MovimientosService, ClientVisibilityService],
  // La spec 004 decide con este service qué movimientos ve cada cliente.
  exports: [ClientVisibilityService],
})
export class MovimientosModule {}
