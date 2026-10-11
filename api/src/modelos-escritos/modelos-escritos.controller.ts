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
import { CreateModeloDto } from './dto/crear-modelo.dto.js';
import type { ModeloDetalle } from './modelo-detalle.js';
import { MODELOS_MESSAGES, ModelosEscritosService } from './modelos-escritos.service.js';

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

  @Get(':id')
  findOne(@Param('id', ModeloIdPipe) id: number): Promise<ModeloDetalle> {
    return this.modelos.findOne(id);
  }

  @Post()
  create(@CurrentUser() actor: Usuario, @Body() body: CreateModeloDto): Promise<ModeloDetalle> {
    return this.modelos.create(actor, body);
  }
}
