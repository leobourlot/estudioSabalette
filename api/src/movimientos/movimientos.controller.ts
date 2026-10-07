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
import { CreateMovimientoDto } from './dto/crear-movimiento.dto.js';
import type { MovimientoDetalle } from './movimiento-detalle.js';
import { MOVIMIENTOS_MESSAGES, MovimientosService } from './movimientos.service.js';

/** Un id que no es un número no puede ser una causa existente: 404, como cualquier otro. */
const CausaIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(MOVIMIENTOS_MESSAGES.causaNotFound),
});

/** Un movimiento con id no numérico no existe en la causa (RF-34). */
const MovimientoIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(MOVIMIENTOS_MESSAGES.notFound),
});

/**
 * Movimientos de una causa (plan 003). Solo administradores y abogados: los guards globales
 * de la spec 001 rechazan a clientes (403) y visitantes (401) antes de llegar acá (RF-35).
 * Las rutas se anidan bajo la causa, como las partes en la spec 002.
 */
@Roles('admin', 'abogado')
@Controller('panel/causas/:causaId/movimientos')
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Get(':movimientoId')
  findOne(
    @Param('causaId', CausaIdPipe) causaId: number,
    @Param('movimientoId', MovimientoIdPipe) movimientoId: number,
  ): Promise<MovimientoDetalle> {
    return this.movimientos.findOne(causaId, movimientoId);
  }

  @Post()
  create(
    @CurrentUser() actor: Usuario,
    @Param('causaId', CausaIdPipe) causaId: number,
    @Body() body: CreateMovimientoDto,
  ): Promise<MovimientoDetalle> {
    return this.movimientos.create(actor, causaId, body);
  }
}
