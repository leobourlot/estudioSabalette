import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { CreateModeloDto } from './dto/crear-modelo.dto.js';
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

  /**
   * Carga un modelo activo con su autor (RF-13). Los textos ya llegan convertidos y con las
   * marcas en la forma del catálogo desde el DTO. Sin fuero, queda como "otro" (RF-1).
   */
  async create(actor: Usuario, dto: CreateModeloDto): Promise<ModeloDetalle> {
    const modelo = await this.modelos.save(
      this.modelos.create({
        titulo: dto.titulo,
        tipo: dto.tipo,
        fuero: dto.fuero ?? 'otro',
        descripcion: dto.descripcion ?? null,
        texto: dto.texto,
        activo: true,
        creadoPorId: actor.id,
        creadoEn: new Date(),
      }),
    );
    return this.findOne(modelo.id);
  }

  /** Consulta de un modelo con su texto y su autoría, activo o desactivado (RF-16, RF-26). */
  async findOne(id: number): Promise<ModeloDetalle> {
    const modelo = await this.modelos.findOne({ where: { id }, relations: DETAIL_RELATIONS });
    if (!modelo) throw new NotFoundException(MODELOS_MESSAGES.notFound);
    return toModeloDetalle(modelo);
  }
}
