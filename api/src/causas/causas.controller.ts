import { Controller, Get } from '@nestjs/common';
import { Roles } from '../autenticacion/decoradores.js';
import type { IntegranteResumen } from './causa-detalle.js';
import { CausasService } from './causas.service.js';

/**
 * Causas del panel (plan 002). Solo administradores y abogados: los guards globales de la
 * spec 001 rechazan a clientes (403) y visitantes (401) antes de llegar acá (RF-44).
 * Las rutas fijas se declaran antes de las que llevan :id.
 */
@Roles('admin', 'abogado')
@Controller('panel/causas')
export class CausasController {
  constructor(private readonly causas: CausasService) {}

  @Get('integrantes')
  listMembers(): Promise<IntegranteResumen[]> {
    return this.causas.listMembers();
  }
}
