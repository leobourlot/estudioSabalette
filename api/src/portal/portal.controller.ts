import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, Roles } from '../autenticacion/decoradores.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { PortalPageQueryDto } from './dto/pagina-portal.dto.js';
import type { CausaPortalResumen } from './portal-detalle.js';
import { PortalService } from './portal.service.js';
import type { PortalPage } from './reglas-portal.js';

/**
 * Portal del cliente (plan 004). Solo clientes: los guards globales de la spec 001 rechazan a
 * los visitantes (401), a los integrantes y a los clientes con cambio de contraseña pendiente
 * (403) antes de llegar acá (RF-1). Solo hay rutas de consulta (RF-2).
 */
@Roles('cliente')
@Controller('portal/causas')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  @Get()
  list(
    @CurrentUser() usuario: Usuario,
    @Query() query: PortalPageQueryDto,
  ): Promise<PortalPage<CausaPortalResumen>> {
    return this.portal.listCausas(usuario.id, query.pagina ?? 1);
  }
}
