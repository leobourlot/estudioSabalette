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
  Query,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../autenticacion/decoradores.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { CreateModeloDto } from './dto/crear-modelo.dto.js';
import { ListModelosQueryDto } from './dto/listar-modelos.dto.js';
import { UpdateModeloDto } from './dto/modificar-modelo.dto.js';
import { ReactivateModeloDto } from './dto/reactivar-modelo.dto.js';
import type { ModeloDetalle } from './modelo-detalle.js';
import {
  type ModeloPage,
  MODELOS_MESSAGES,
  ModelosEscritosService,
} from './modelos-escritos.service.js';

/** Un id que no es un número no puede ser un modelo existente: 404, como cualquier otro (RF-49). */
export const ModeloIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(MODELOS_MESSAGES.notFound),
});

/**
 * Modelos de escritos del estudio (plan 006). Solo administradores y abogados: los guards
 * globales de la spec 001 rechazan a clientes (403), a visitantes (401) y a cuentas con cambio
 * de contraseña pendiente (403) antes de llegar acá (RF-50).
 */
@Roles('admin', 'abogado')
@Controller('panel/modelos-escritos')
export class ModelosEscritosController {
  constructor(private readonly modelos: ModelosEscritosService) {}

  // También es la lista de modelos de una causa, que no envía incluirDesactivados (RF-29).
  @Get()
  list(@Query() query: ListModelosQueryDto): Promise<ModeloPage> {
    return this.modelos.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ModeloIdPipe) id: number): Promise<ModeloDetalle> {
    return this.modelos.findOne(id);
  }

  @Post()
  create(@CurrentUser() actor: Usuario, @Body() body: CreateModeloDto): Promise<ModeloDetalle> {
    return this.modelos.create(actor, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: Usuario,
    @Param('id', ModeloIdPipe) id: number,
    @Body() body: UpdateModeloDto,
  ): Promise<ModeloDetalle> {
    return this.modelos.update(actor, id, body);
  }

  @Post(':id/desactivar')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @CurrentUser() actor: Usuario,
    @Param('id', ModeloIdPipe) id: number,
  ): Promise<ModeloDetalle> {
    return this.modelos.deactivate(actor, id);
  }

  @Post(':id/reactivar')
  @HttpCode(HttpStatus.OK)
  reactivate(
    @CurrentUser() actor: Usuario,
    @Param('id', ModeloIdPipe) id: number,
    @Body() body: ReactivateModeloDto,
  ): Promise<ModeloDetalle> {
    return this.modelos.reactivate(actor, id, body.confirmarRepetido === true);
  }
}
