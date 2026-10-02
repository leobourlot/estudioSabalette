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
import { TemporaryPasswordDto } from './dto/contrasena-temporal.dto.js';
import { CreateUserDto } from './dto/crear-usuario.dto.js';
import { ListUsersQueryDto } from './dto/listar-usuarios.dto.js';
import { UpdateUserDto } from './dto/modificar-usuario.dto.js';
import type { UsuarioDetalle } from './usuario-detalle.js';
import type { Usuario } from './usuario.entity.js';
import { USERS_MESSAGES, type UserPage, UsersService } from './usuarios.service.js';

/** Un id que no es un número no puede ser una cuenta existente: 404, como cualquier otro. */
const UserIdPipe = new ParseIntPipe({
  exceptionFactory: () => new NotFoundException(USERS_MESSAGES.notFound),
});

/**
 * Gestión de cuentas del panel (RF-20 a RF-34). Entran administradores y abogados; qué puede
 * hacer cada uno sobre cada cuenta lo decide UsersService con permisos-gestion.
 */
@Roles('admin', 'abogado')
@Controller('panel/usuarios')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() actor: Usuario, @Query() query: ListUsersQueryDto): Promise<UserPage> {
    return this.users.list(actor, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() actor: Usuario,
    @Param('id', UserIdPipe) id: number,
  ): Promise<UsuarioDetalle> {
    return this.users.findOne(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: Usuario, @Body() body: CreateUserDto): Promise<UsuarioDetalle> {
    return this.users.create(actor, body);
  }

  @Post(':id/desactivar')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@CurrentUser() actor: Usuario, @Param('id', UserIdPipe) id: number): Promise<void> {
    return this.users.deactivate(actor, id);
  }

  @Post(':id/reactivar')
  @HttpCode(HttpStatus.NO_CONTENT)
  reactivate(
    @CurrentUser() actor: Usuario,
    @Param('id', UserIdPipe) id: number,
    @Body() body: TemporaryPasswordDto,
  ): Promise<void> {
    return this.users.reactivate(actor, id, body.contrasenaTemporal);
  }

  @Post(':id/restablecer-contrasena')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(
    @CurrentUser() actor: Usuario,
    @Param('id', UserIdPipe) id: number,
    @Body() body: TemporaryPasswordDto,
  ): Promise<void> {
    return this.users.resetPassword(actor, id, body.contrasenaTemporal);
  }

  @Post(':id/liberar-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  releaseEmail(@CurrentUser() actor: Usuario, @Param('id', UserIdPipe) id: number): Promise<void> {
    return this.users.releaseEmail(actor, id);
  }

  @Post(':id/transferir-principal')
  @HttpCode(HttpStatus.NO_CONTENT)
  transferPrincipal(
    @CurrentUser() actor: Usuario,
    @Param('id', UserIdPipe) id: number,
  ): Promise<void> {
    return this.users.transferPrincipal(actor, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: Usuario,
    @Param('id', UserIdPipe) id: number,
    @Body() body: UpdateUserDto,
  ): Promise<UsuarioDetalle> {
    return this.users.update(actor, id, body);
  }
}
