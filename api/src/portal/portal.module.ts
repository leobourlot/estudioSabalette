import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Causa } from '../causas/causa.entity.js';
import { CausasModule } from '../causas/causas.module.js';
import { MovimientosModule } from '../movimientos/movimientos.module.js';
import { PortalController } from './portal.controller.js';
import { PortalService } from './portal.service.js';

/**
 * Portal del cliente (plan 004). Usa ClientLinkService (CausasModule) y
 * ClientVisibilityService (MovimientosModule), que esos módulos exportan.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Causa]), CausasModule, MovimientosModule],
  controllers: [PortalController],
  providers: [PortalService],
})
export class PortalModule {}
