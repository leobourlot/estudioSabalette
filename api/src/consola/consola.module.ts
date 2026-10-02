import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordsService } from '../autenticacion/contrasenas.service.js';
import { DatabaseModule } from '../base-de-datos/base-de-datos.module.js';
import { ConfigurationModule } from '../configuracion/configuracion.module.js';
import { Cliente } from '../usuarios/cliente.entity.js';
import { Sesion } from '../usuarios/sesion.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { PrincipalAdminService } from './administrador-principal.service.js';

/** Lo mínimo para el comando de consola: configuración y base, sin la parte HTTP. */
@Module({
  imports: [
    ConfigurationModule,
    DatabaseModule,
    TypeOrmModule.forFeature([Usuario, Cliente, Sesion]),
  ],
  providers: [PasswordsService, PrincipalAdminService],
})
export class ConsoleModule {}
