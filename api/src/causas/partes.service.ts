import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Cliente } from '../usuarios/cliente.entity.js';
import { type CausaReferencia, toCausaReferencia } from './causa-detalle.js';
import type { CreateParteDto, UpdateParteDto } from './dto/parte.dto.js';
import { Parte } from './parte.entity.js';
import { QUESTION_CODES, QuestionException } from './preguntas.js';
import {
  documentOf,
  hasSameName,
  isSamePerson,
  type PartyIdentity,
  partyIdentity,
} from './reglas-causas.js';

export const PARTES_MESSAGES = {
  clientNotFound: 'No existe ese cliente',
  clientDeactivated: 'El cliente está desactivado',
  repeatedPerson: 'Esa persona ya es parte de la causa',
  partyNotFound: 'No existe esa parte',
  clientPartyData: 'Los datos de una parte cliente se modifican desde su cuenta',
  clientPartyChange: 'Una parte cliente no se puede cambiar por otro cliente',
  clientDocument: 'Ese DNI o CUIT pertenece a un cliente del estudio',
  deactivatedClientDocument: 'Ese DNI o CUIT pertenece a un cliente desactivado',
  repeatedName: 'Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?',
  clientName: 'Hay clientes del estudio con ese nombre. ¿Es alguno de ellos?',
} as const;

/** Parte vigente de la causa, o anterior del mismo alta (sin id todavía). */
export type ActiveParty = PartyIdentity & { parteId?: number };

/** Cliente ofrecido en la pregunta de RF-19, con sus datos para distinguir homónimos. */
export type ClientCandidate = Omit<PartyIdentity, 'clienteId'> & { id: number };

/** Parte no cliente con documento distinto del de la otra: el documento ya dice que son otras personas. */
const bothDocumented = (a: PartyIdentity, b: PartyIdentity) =>
  documentOf(a) !== null && documentOf(b) !== null;

function clientIdentity(cliente: Cliente): PartyIdentity {
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

/** Partes de una causa (plan 002, "Agregar o modificar una parte"). */
@Injectable()
export class PartesService {
  constructor(
    @InjectRepository(Cliente) private readonly clients: Repository<Cliente>,
    @InjectRepository(Parte) private readonly parties: Repository<Parte>,
  ) {}

  /**
   * RF-20: causas activas, distintas de exceptCausaId, donde alguno de los clientes
   * vinculados figura como parte no cliente vigente con su DNI o CUIT. Solo se informan:
   * esas causas no se modifican y el cliente no las ve.
   */
  async findCasesAsNonClient(
    linked: readonly PartyIdentity[],
    exceptCausaId: number,
  ): Promise<CausaReferencia[]> {
    const clients = linked.filter((identity) => identity.clienteId !== null);
    const dnis = clients.flatMap((identity) => (identity.dni ? [identity.dni] : []));
    const cuits = clients.flatMap((identity) => (identity.cuit ? [identity.cuit] : []));
    if (dnis.length === 0 && cuits.length === 0) return [];

    const common = {
      vigente: true,
      clienteId: IsNull(),
      causa: { activa: true, id: Not(exceptCausaId) },
    };
    const matches = await this.parties.find({
      where: [
        ...(dnis.length > 0 ? [{ ...common, dni: In(dnis) }] : []),
        ...(cuits.length > 0 ? [{ ...common, cuit: In(cuits) }] : []),
      ],
      relations: { causa: true },
      order: { causaId: 'ASC' },
    });
    const causas = new Map(matches.map((parte) => [parte.causa.id, parte.causa]));
    return [...causas.values()].map(toCausaReferencia);
  }

  /**
   * Resuelve la identidad de una parte nueva y aplica, en orden, los rechazos y las
   * preguntas de RF-16 a RF-19:
   * 1. Cliente inexistente (404), cliente desactivado (RF-17) y persona que ya es parte
   *    vigente de la causa, por el mismo cliente o el mismo DNI o CUIT (RF-18).
   * 2. DNI o CUIT de una parte no cliente que pertenece a un cliente del estudio (RF-16).
   * 3. Mismo nombre que otra parte de la causa sin documentos que los distingan (RF-19).
   * 4. Parte no cliente sin documento con el nombre de clientes activos del estudio (RF-19).
   * Cada pregunta se saltea si el cuerpo ya trae la respuesta.
   */
  async resolveNewParty(
    parte: CreateParteDto | UpdateParteDto,
    activeParties: readonly ActiveParty[],
  ): Promise<PartyIdentity> {
    const identity = await this.identityOf(parte);
    if (activeParties.some((other) => isSamePerson(other, identity))) {
      throw new ConflictException(PARTES_MESSAGES.repeatedPerson);
    }

    const isClient = identity.clienteId !== null;
    if (!isClient && !parte.confirmarDocumentoDeCliente) {
      await this.askAboutClientDocument(identity);
    }

    const homonym = activeParties.find(
      (other) => hasSameName(other, identity) && !bothDocumented(other, identity),
    );
    if (homonym && !parte.confirmarNombreRepetido) {
      throw new QuestionException(
        QUESTION_CODES.repeatedName,
        PARTES_MESSAGES.repeatedName,
        homonym.parteId === undefined ? {} : { parteId: homonym.parteId },
      );
    }

    if (!isClient && documentOf(identity) === null && !parte.confirmarNombreDeCliente) {
      await this.askAboutClientName(identity);
    }
    return identity;
  }

  private async identityOf(parte: CreateParteDto | UpdateParteDto): Promise<PartyIdentity> {
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
    return clientIdentity(cliente);
  }

  /** RF-16: si el DNI o CUIT es de un cliente, pregunta si se la agrega como cliente. */
  private async askAboutClientDocument(identity: PartyIdentity): Promise<void> {
    if (documentOf(identity) === null) return;
    const cliente = await this.clients.findOne({
      where: identity.dni !== null ? { dni: identity.dni } : { cuit: identity.cuit! },
      relations: { usuario: true },
    });
    if (!cliente) return;
    const clienteActivo = cliente.usuario.activo;
    throw new QuestionException(
      QUESTION_CODES.clientDocument,
      clienteActivo ? PARTES_MESSAGES.clientDocument : PARTES_MESSAGES.deactivatedClientDocument,
      { clienteId: cliente.usuarioId, clienteActivo },
    );
  }

  /**
   * RF-19: si hay clientes activos con el mismo nombre y apellido (persona física) o la
   * misma razón social (jurídica), pregunta si es alguno de ellos. La intercalación de la
   * base compara sin distinguir mayúsculas ni tildes. Los desactivados no se ofrecen porque
   * no se pueden vincular (RF-17).
   */
  private async askAboutClientName(identity: PartyIdentity): Promise<void> {
    const where =
      identity.tipoPersona === 'juridica'
        ? {
            tipoPersona: 'juridica' as const,
            razonSocial: identity.razonSocial!,
            usuario: { activo: true },
          }
        : {
            tipoPersona: 'fisica' as const,
            usuario: { nombre: identity.nombre!, apellido: identity.apellido!, activo: true },
          };
    const homonyms = await this.clients.find({
      where,
      relations: { usuario: true },
      order: { usuarioId: 'ASC' },
    });
    if (homonyms.length === 0) return;

    const clientes: ClientCandidate[] = homonyms.map((cliente) => {
      const { clienteId, ...data } = clientIdentity(cliente);
      return { id: clienteId!, ...data };
    });
    throw new QuestionException(QUESTION_CODES.clientName, PARTES_MESSAGES.clientName, {
      clientes,
    });
  }
}
