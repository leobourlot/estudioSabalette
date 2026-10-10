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
import { CreateFalloDto } from './dto/crear-fallo.dto.js';
import { ListFallosQueryDto } from './dto/listar-fallos.dto.js';
import { UpdateFalloDto } from './dto/modificar-fallo.dto.js';
import { ReactivateFalloDto } from './dto/reactivar-fallo.dto.js';
import { SuggestionsQueryDto } from './dto/sugerencias.dto.js';
import type { FalloDetalle, PalabraClaveSugerencia } from './fallo-detalle.js';
import {
  type FalloPage,
  JURISPRUDENCIA_MESSAGES,
  JurisprudenciaService,
} from './jurisprudencia.service.js';
import { PalabrasClaveService } from './palabras-clave.service.js';

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
  constructor(
    private readonly jurisprudencia: JurisprudenciaService,
    private readonly palabrasClave: PalabrasClaveService,
  ) {}

  @Get()
  list(@Query() query: ListFallosQueryDto): Promise<FalloPage> {
    return this.jurisprudencia.list(query);
  }

  // Va antes de GET /:id, para que "palabras-clave" no se tome como un id.
  @Get('palabras-clave')
  suggestKeywords(@Query() query: SuggestionsQueryDto): Promise<PalabraClaveSugerencia[]> {
    return this.palabrasClave.suggest(query.buscar, query.para ?? 'carga');
  }

  @Get(':id')
  findOne(@Param('id', FalloIdPipe) id: number): Promise<FalloDetalle> {
    return this.jurisprudencia.findOne(id);
  }

  @Post()
  create(@CurrentUser() actor: Usuario, @Body() body: CreateFalloDto): Promise<FalloDetalle> {
    return this.jurisprudencia.create(actor, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: Usuario,
    @Param('id', FalloIdPipe) id: number,
    @Body() body: UpdateFalloDto,
  ): Promise<FalloDetalle> {
    return this.jurisprudencia.update(actor, id, body);
  }

  @Post(':id/desactivar')
  @HttpCode(HttpStatus.OK)
  deactivate(
    @CurrentUser() actor: Usuario,
    @Param('id', FalloIdPipe) id: number,
  ): Promise<FalloDetalle> {
    return this.jurisprudencia.deactivate(actor, id);
  }

  @Post(':id/reactivar')
  @HttpCode(HttpStatus.OK)
  reactivate(
    @CurrentUser() actor: Usuario,
    @Param('id', FalloIdPipe) id: number,
    @Body() body: ReactivateFalloDto,
  ): Promise<FalloDetalle> {
    return this.jurisprudencia.reactivate(actor, id, body.confirmarRepetido === true);
  }
}
