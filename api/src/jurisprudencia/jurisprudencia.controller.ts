import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { Roles } from '../autenticacion/decoradores.js';
import type { FalloDetalle } from './fallo-detalle.js';
import { JURISPRUDENCIA_MESSAGES, JurisprudenciaService } from './jurisprudencia.service.js';

/** Un id que no es un número no puede ser un fallo existente: 404, como cualquier otro (RF-33). */
const FalloIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(JURISPRUDENCIA_MESSAGES.notFound),
});

/**
 * Jurisprudencia del estudio (plan 005). Solo administradores y abogados: los guards
 * globales de la spec 001 rechazan a clientes (403), a visitantes (401) y a cuentas con
 * cambio de contraseña pendiente (403) antes de llegar acá (RF-34).
 */
@Roles('admin', 'abogado')
@Controller('panel/jurisprudencia')
export class JurisprudenciaController {
  constructor(private readonly jurisprudencia: JurisprudenciaService) {}

  @Get(':id')
  findOne(@Param('id', FalloIdPipe) id: number): Promise<FalloDetalle> {
    return this.jurisprudencia.findOne(id);
  }
}
