import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../autenticacion/decoradores.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type {
  CausaDetalle,
  IntegranteResumen,
  ResultadoAlta,
  ResultadoParte,
} from './causa-detalle.js';
import { CAUSAS_MESSAGES, CausasService } from './causas.service.js';
import { CreateCausaDto } from './dto/crear-causa.dto.js';
import { UpdateCausaDto } from './dto/modificar-causa.dto.js';
import { CreateParteDto, UpdateParteDto } from './dto/parte.dto.js';
import { PARTES_MESSAGES } from './partes.service.js';

/** Un id que no es un número no puede ser una causa existente: 404, como cualquier otro. */
const CausaIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(CAUSAS_MESSAGES.notFound),
});

/** Una parte con id no numérico no existe en la causa (RF-25). */
const ParteIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(PARTES_MESSAGES.partyNotFound),
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

  @Patch(':id')
  update(
    @CurrentUser() actor: Usuario,
    @Param('id', CausaIdPipe) id: number,
    @Body() body: UpdateCausaDto,
  ): Promise<CausaDetalle> {
    return this.causas.update(actor, id, body);
  }

  @Post(':id/partes')
  addParty(
    @CurrentUser() actor: Usuario,
    @Param('id', CausaIdPipe) id: number,
    @Body() body: CreateParteDto,
  ): Promise<ResultadoParte> {
    return this.causas.addParty(actor, id, body);
  }

  @Put(':id/partes/:parteId')
  updateParty(
    @CurrentUser() actor: Usuario,
    @Param('id', CausaIdPipe) id: number,
    @Param('parteId', ParteIdPipe) parteId: number,
    @Body() body: UpdateParteDto,
  ): Promise<ResultadoParte> {
    return this.causas.updateParty(actor, id, parteId, body);
  }

  @Post(':id/partes/:parteId/desvincular')
  @HttpCode(HttpStatus.OK)
  unlinkParty(
    @CurrentUser() actor: Usuario,
    @Param('id', CausaIdPipe) id: number,
    @Param('parteId', ParteIdPipe) parteId: number,
  ): Promise<CausaDetalle> {
    return this.causas.unlinkParty(actor, id, parteId);
  }

  @Post(':id/partes/:parteId/revincular')
  @HttpCode(HttpStatus.OK)
  relinkParty(
    @CurrentUser() actor: Usuario,
    @Param('id', CausaIdPipe) id: number,
    @Param('parteId', ParteIdPipe) parteId: number,
  ): Promise<ResultadoParte> {
    return this.causas.relinkParty(actor, id, parteId);
  }
}
