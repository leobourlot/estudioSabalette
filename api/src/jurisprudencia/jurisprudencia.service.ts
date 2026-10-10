import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type FalloDetalle, toFalloDetalle } from './fallo-detalle.js';
import { Fallo } from './fallo.entity.js';

export const JURISPRUDENCIA_MESSAGES = {
  notFound: 'No existe ese fallo',
  deactivated: 'El fallo está desactivado. Reactivalo para modificarlo',
  alreadyDeactivated: 'El fallo ya está desactivado',
  alreadyActive: 'El fallo ya está activo',
} as const;

/** Relaciones que necesita toFalloDetalle. */
const DETAIL_RELATIONS = {
  creadoPor: true,
  modificadoPor: true,
  palabrasClave: { palabraClave: true },
};

/** Fallos del registro de jurisprudencia (plan 005). */
@Injectable()
export class JurisprudenciaService {
  constructor(@InjectRepository(Fallo) private readonly fallos: Repository<Fallo>) {}

  /** Consulta de un fallo con sus palabras clave y su autoría, activo o desactivado (RF-19, RF-30). */
  async findOne(id: number): Promise<FalloDetalle> {
    const fallo = await this.fallos.findOne({ where: { id }, relations: DETAIL_RELATIONS });
    if (!fallo) throw new NotFoundException(JURISPRUDENCIA_MESSAGES.notFound);
    return toFalloDetalle(
      fallo,
      fallo.palabrasClave.map((relacion) => relacion.palabraClave),
    );
  }
}
