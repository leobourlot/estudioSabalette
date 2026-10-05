import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import { type IntegranteResumen, toIntegranteResumen } from './causa-detalle.js';

@Injectable()
export class CausasService {
  constructor(@InjectRepository(Usuario) private readonly users: Repository<Usuario>) {}

  /**
   * Administradores y abogados, activos y desactivados, por apellido (RF-29, RF-38). La
   * interfaz ofrece los activos para asignar y usa los desactivados para mostrar a los que
   * ya están asignados. Existe porque un abogado no puede listar integrantes en
   * /api/panel/usuarios (spec 001).
   */
  async listMembers(): Promise<IntegranteResumen[]> {
    const members = await this.users.find({
      where: { rol: In(['admin', 'abogado']) },
      order: { apellido: 'ASC', nombre: 'ASC', id: 'ASC' },
    });
    return members.map(toIntegranteResumen);
  }
}
