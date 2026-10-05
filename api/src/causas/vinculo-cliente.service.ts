import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parte } from './parte.entity.js';

/**
 * Vínculo cliente-causa (RF-26): un cliente está vinculado a una causa solo mientras es
 * parte vigente de ella y la causa está activa, cualquiera sea su estado. Es la única
 * consulta del vínculo: la spec 004 la usa en cada petición del portal para filtrar en el
 * servidor lo que ve un cliente (principio 5). Como se calcula siempre, desvincular la
 * parte o desactivar la causa corta el acceso desde la siguiente acción (RF-27), y
 * reactivar la causa o la cuenta lo devuelve sin código extra (RF-28, RF-42).
 */
@Injectable()
export class ClientLinkService {
  constructor(@InjectRepository(Parte) private readonly parties: Repository<Parte>) {}

  /** Ids de las causas vinculadas al cliente, de menor a mayor. */
  async linkedCausaIds(clienteId: number): Promise<number[]> {
    const parties = await this.parties.find({
      select: { causaId: true },
      where: { clienteId, vigente: true, causa: { activa: true } },
      order: { causaId: 'ASC' },
    });
    return [...new Set(parties.map((parte) => parte.causaId))];
  }

  isLinked(clienteId: number, causaId: number): Promise<boolean> {
    return this.parties.exists({
      where: { clienteId, causaId, vigente: true, causa: { activa: true } },
    });
  }
}
