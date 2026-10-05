import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '../usuarios/cliente.entity.js';
import type { CreateParteDto } from './dto/parte.dto.js';
import { isSamePerson, type PartyIdentity, partyIdentity } from './reglas-causas.js';

export const PARTES_MESSAGES = {
  clientNotFound: 'No existe ese cliente',
  clientDeactivated: 'El cliente está desactivado',
  repeatedPerson: 'Esa persona ya es parte de la causa',
} as const;

/** Partes de una causa (plan 002, "Agregar o modificar una parte"). */
@Injectable()
export class PartesService {
  constructor(@InjectRepository(Cliente) private readonly clients: Repository<Cliente>) {}

  /**
   * Resuelve la identidad de una parte nueva y aplica los controles que la rechazan:
   * cliente inexistente (404), cliente desactivado (RF-17) y persona que ya es parte
   * vigente de la causa, sea por el mismo cliente o por el mismo DNI o CUIT (RF-18).
   * activeParties son las partes vigentes de la causa, o las anteriores del mismo alta.
   */
  async resolveNewParty(
    parte: CreateParteDto,
    activeParties: readonly PartyIdentity[],
  ): Promise<PartyIdentity> {
    const identity = await this.identityOf(parte);
    if (activeParties.some((other) => isSamePerson(other, identity))) {
      throw new ConflictException(PARTES_MESSAGES.repeatedPerson);
    }
    return identity;
  }

  private async identityOf(parte: CreateParteDto): Promise<PartyIdentity> {
    if (parte.clienteId === undefined) {
      return partyIdentity({
        clienteId: null,
        tipoPersona: parte.tipoPersona ?? null,
        nombre: parte.nombre ?? null,
        apellido: parte.apellido ?? null,
        razonSocial: parte.razonSocial ?? null,
        dni: parte.dni ?? null,
        cuit: parte.cuit ?? null,
        cliente: null,
      });
    }

    const cliente = await this.clients.findOne({
      where: { usuarioId: parte.clienteId },
      relations: { usuario: true },
    });
    if (!cliente) throw new NotFoundException(PARTES_MESSAGES.clientNotFound);
    if (!cliente.usuario.activo) throw new ConflictException(PARTES_MESSAGES.clientDeactivated);
    return partyIdentity({
      clienteId: cliente.usuarioId,
      tipoPersona: null,
      nombre: null,
      apellido: null,
      razonSocial: null,
      dni: null,
      cuit: null,
      cliente,
    });
  }
}
