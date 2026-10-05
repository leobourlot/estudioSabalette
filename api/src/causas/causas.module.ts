import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../usuarios/cliente.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Causa } from './causa.entity.js';
import { CausasController } from './causas.controller.js';
import { CausasService } from './causas.service.js';
import { Colaborador } from './colaborador.entity.js';
import { Parte } from './parte.entity.js';
import { PartesService } from './partes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Causa, Parte, Colaborador, Usuario, Cliente])],
  controllers: [CausasController],
  providers: [CausasService, PartesService],
})
export class CausasModule {}
