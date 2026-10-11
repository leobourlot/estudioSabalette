import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { Roles } from '../autenticacion/decoradores.js';
import { ESCRITOS_MESSAGES, EscritosService } from './escritos.service.js';
import type { EscritoCompletado } from './modelo-detalle.js';

/** Un id que no es un número no puede ser una causa ni un modelo existente: 404 (RF-49). */
const CausaIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(ESCRITOS_MESSAGES.causaNotFound),
});

const ModeloIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(ESCRITOS_MESSAGES.modeloNotFound),
});

/**
 * Escrito completado de una causa (plan 006). La ruta va bajo la causa, como los movimientos,
 * porque un modelo solo se completa desde una causa (RF-30). Es un GET porque no cambia nada
 * (RF-43, RF-46). Solo administradores y abogados: los guards globales de la spec 001
 * rechazan a clientes (403), a visitantes (401) y a cuentas con cambio de contraseña pendiente
 * (403) antes de llegar acá (RF-50).
 */
@Roles('admin', 'abogado')
@Controller('panel/causas/:causaId/escritos')
export class EscritosController {
  constructor(private readonly escritos: EscritosService) {}

  @Get(':modeloId')
  complete(
    @Param('causaId', CausaIdPipe) causaId: number,
    @Param('modeloId', ModeloIdPipe) modeloId: number,
  ): Promise<EscritoCompletado> {
    return this.escritos.complete(causaId, modeloId);
  }
}
