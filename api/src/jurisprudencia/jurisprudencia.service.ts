import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { toSearchableCaseNumber } from '../causas/validadores/texto-causa.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { CreateFalloDto } from './dto/crear-fallo.dto.js';
import { type FalloDetalle, toFalloDetalle } from './fallo-detalle.js';
import { FalloPalabraClave } from './fallo-palabra-clave.entity.js';
import { Fallo } from './fallo.entity.js';
import { PalabrasClaveService } from './palabras-clave.service.js';

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

/** El número sin separadores, para la búsqueda (RF-23); null si el fallo no tiene número. */
const searchableNumber = (numero: string | null) =>
  numero === null ? null : toSearchableCaseNumber(numero);

/** Fallos del registro de jurisprudencia (plan 005). */
@Injectable()
export class JurisprudenciaService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Fallo) private readonly fallos: Repository<Fallo>,
    private readonly palabrasClave: PalabrasClaveService,
  ) {}

  /**
   * Carga un fallo activo con su autor (RF-16). Las palabras clave se resuelven contra el
   * catálogo en la misma transacción que guarda el fallo: si algo falla, no queda ninguna
   * palabra nueva (RF-12).
   */
  async create(actor: Usuario, dto: CreateFalloDto): Promise<FalloDetalle> {
    const id = await this.dataSource.transaction(async (manager) => {
      const palabraIds = await this.palabrasClave.resolve(manager, dto.palabrasClave);
      const numero = dto.numero ?? null;
      const fallo = await manager.save(
        manager.create(Fallo, {
          caratula: dto.caratula,
          tribunal: dto.tribunal,
          fuero: dto.fuero,
          fecha: dto.fecha,
          numero,
          numeroBusqueda: searchableNumber(numero),
          sumario: dto.sumario,
          enlace: dto.enlace ?? null,
          activo: true,
          creadoPorId: actor.id,
          creadoEn: new Date(),
        }),
      );
      await manager.insert(
        FalloPalabraClave,
        palabraIds.map((palabraClaveId) => ({ falloId: fallo.id, palabraClaveId })),
      );
      return fallo.id;
    });
    return this.findOne(id);
  }

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
