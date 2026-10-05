import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../autenticacion/decoradores.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { CausaDetalle, IntegranteResumen, ResultadoAlta } from './causa-detalle.js';
import { CAUSAS_MESSAGES, CausasService } from './causas.service.js';
import { CreateCausaDto } from './dto/crear-causa.dto.js';

/** Un id que no es un número no puede ser una causa existente: 404, como cualquier otro. */
const CausaIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(CAUSAS_MESSAGES.notFound),
});

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

  @Get(':id')
  findOne(@Param('id', CausaIdPipe) id: number): Promise<CausaDetalle> {
    return this.causas.findOne(id);
  }

  @Post()
  create(@CurrentUser() actor: Usuario, @Body() body: CreateCausaDto): Promise<ResultadoAlta> {
    return this.causas.create(actor, body);
  }
}
