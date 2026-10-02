import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, Roles } from '../autenticacion/decoradores.js';
import { CreateUserDto } from './dto/crear-usuario.dto.js';
import type { UsuarioDetalle } from './usuario-detalle.js';
import type { Usuario } from './usuario.entity.js';
import { UsersService } from './usuarios.service.js';

/**
 * Gestión de cuentas del panel (RF-20 a RF-34). Entran administradores y abogados; qué puede
 * hacer cada uno sobre cada cuenta lo decide UsersService con permisos-gestion.
 */
@Roles('admin', 'abogado')
@Controller('panel/usuarios')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@CurrentUser() actor: Usuario, @Body() body: CreateUserDto): Promise<UsuarioDetalle> {
    return this.users.create(actor, body);
  }
}
