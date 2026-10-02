import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationModule } from '../autenticacion/autenticacion.module.js';
import { Cliente } from './cliente.entity.js';
import { Sesion } from './sesion.entity.js';
import { Usuario } from './usuario.entity.js';
import { UsersController } from './usuarios.controller.js';
import { UsersService } from './usuarios.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Cliente, Sesion]), AuthenticationModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
