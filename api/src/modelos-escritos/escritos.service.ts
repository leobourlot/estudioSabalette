import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Causa } from '../causas/causa.entity.js';
import { caseValues, completeText } from './completar-escrito.js';
import { type EscritoCompletado, toEscritoCompletado } from './modelo-detalle.js';
import { ModeloEscrito } from './modelo-escrito.entity.js';

export const ESCRITOS_MESSAGES = {
  causaNotFound: 'No existe esa causa',
  causaDeactivated: 'La causa está desactivada',
  modeloNotFound: 'No existe ese modelo',
  modeloDeactivated: 'El modelo está desactivado',
} as const;

/**
 * Escritos completados (plan 006, "Completar un modelo"). Solo lee: no escribe en la causa, en
 * el modelo ni en ninguna otra tabla, y no deja registro de qué se completó (RF-43, RF-46).
 * Cada pedido arma el escrito de nuevo, con los datos del momento (RF-33).
 */
@Injectable()
export class EscritosService {
  constructor(
    @InjectRepository(Causa) private readonly causas: Repository<Causa>,
    @InjectRepository(ModeloEscrito) private readonly modelos: Repository<ModeloEscrito>,
  ) {}

  /**
   * Completa un modelo activo con los datos de una causa activa, cualquiera sea su estado
   * (RF-32, RF-42). Primero se verifica la causa y después el modelo. El integrante que lo
   * completa no interviene en el resultado (RF-38).
   */
  async complete(
    causaId: number,
    modeloId: number,
    ahora: Date = new Date(),
  ): Promise<EscritoCompletado> {
    const causa = await this.causas.findOne({
      where: { id: causaId },
      relations: { responsable: true, partes: { cliente: { usuario: true } } },
    });
    if (!causa) throw new NotFoundException(ESCRITOS_MESSAGES.causaNotFound);
    if (!causa.activa) throw new ConflictException(ESCRITOS_MESSAGES.causaDeactivated);

    const modelo = await this.modelos.findOne({
      select: { id: true, titulo: true, texto: true, activo: true },
      where: { id: modeloId },
    });
    if (!modelo) throw new NotFoundException(ESCRITOS_MESSAGES.modeloNotFound);
    if (!modelo.activo) throw new ConflictException(ESCRITOS_MESSAGES.modeloDeactivated);

    return toEscritoCompletado(causa, modelo, completeText(modelo.texto, caseValues(causa, ahora)));
  }
}
