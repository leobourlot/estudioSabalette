import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type ModeloDetalle, toModeloDetalle } from './modelo-detalle.js';
import { ModeloEscrito } from './modelo-escrito.entity.js';

export const MODELOS_MESSAGES = {
  notFound: 'No existe ese modelo',
} as const;

/** Relaciones que necesita toModeloDetalle. */
const DETAIL_RELATIONS = { creadoPor: true, modificadoPor: true };

/** Modelos de escritos del estudio (plan 006). */
@Injectable()
export class ModelosEscritosService {
  constructor(
    @InjectRepository(ModeloEscrito) private readonly modelos: Repository<ModeloEscrito>,
  ) {}

  /** Consulta de un modelo con su texto y su autoría, activo o desactivado (RF-16, RF-26). */
  async findOne(id: number): Promise<ModeloDetalle> {
    const modelo = await this.modelos.findOne({ where: { id }, relations: DETAIL_RELATIONS });
    if (!modelo) throw new NotFoundException(MODELOS_MESSAGES.notFound);
    return toModeloDetalle(modelo);
  }
}
