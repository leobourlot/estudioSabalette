import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, In, Not, QueryFailedError, Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import {
  type CausaDetalle,
  type IntegranteResumen,
  type ResultadoAlta,
  toCausaDetalle,
  toIntegranteResumen,
} from './causa-detalle.js';
import { Causa } from './causa.entity.js';
import { Colaborador } from './colaborador.entity.js';
import type { CreateCausaDto } from './dto/crear-causa.dto.js';
import { type CreateParteDto, validateCreateParte } from './dto/parte.dto.js';
import { Parte } from './parte.entity.js';
import { PartesService } from './partes.service.js';
import {
  type CaseKeyData,
  caseKey,
  checkLawyers,
  type LawyerAssignment,
  type PartyIdentity,
  type RuleDecision,
} from './reglas-causas.js';
import { toSearchableCaseNumber } from './validadores/texto-causa.js';

export const CAUSAS_MESSAGES = {
  notFound: 'No existe esa causa',
  duplicateCaseNumber: 'Ya existe una causa con ese número de expediente en ese juzgado y fuero',
  repeatedCaseNumber: 'Ya existe otra causa con ese número de expediente',
} as const;

/**
 * Códigos de las preguntas que la interfaz le hace al integrante: llegan como 409 con
 * `codigo`, para distinguirlas de un rechazo definitivo (plan 002, "Preguntas").
 */
export const QUESTION_CODES = {
  repeatedCaseNumber: 'EXPEDIENTE_REPETIDO',
} as const;

/** Índice único de la columna generada claveExpediente (migración de la spec 002). */
const CASE_NUMBER_INDEX = 'UQ_causas_expediente_activo';

/** Relaciones que necesita toCausaDetalle. */
const DETAIL_RELATIONS = {
  responsable: true,
  colaboradores: { usuario: true },
  partes: { cliente: { usuario: true } },
  creadoPor: true,
  modificadoPor: true,
  desactivadaPor: true,
  reactivadaPor: true,
} as const;

/** Convierte una decisión de reglas-causas en la respuesta HTTP correspondiente. */
function throwIfDenied(decision: RuleDecision): void {
  if (decision) throw new HttpException(decision.message, decision.status);
}

/** Fila de una parte nueva: una parte cliente no guarda datos propios (RF-14, RF-15). */
function toParteRow(parte: CreateParteDto, causaId: number, actorId: number) {
  const isClient = parte.clienteId !== undefined;
  return {
    causaId,
    rol: parte.rol,
    clienteId: parte.clienteId ?? null,
    tipoPersona: isClient ? null : (parte.tipoPersona ?? null),
    nombre: isClient ? null : (parte.nombre ?? null),
    apellido: isClient ? null : (parte.apellido ?? null),
    razonSocial: isClient ? null : (parte.razonSocial ?? null),
    dni: isClient ? null : (parte.dni ?? null),
    cuit: isClient ? null : (parte.cuit ?? null),
    vigente: true,
    creadoPorId: actorId,
  };
}

@Injectable()
export class CausasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Causa) private readonly causas: Repository<Causa>,
    @InjectRepository(Usuario) private readonly users: Repository<Usuario>,
    private readonly partes: PartesService,
  ) {}

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

  /** Consulta de una causa con sus partes, abogados y auditoría (RF-12). */
  async findOne(id: number): Promise<CausaDetalle> {
    const causa = await this.causas.findOne({ where: { id }, relations: DETAIL_RELATIONS });
    if (!causa) throw new NotFoundException(CAUSAS_MESSAGES.notFound);
    return toCausaDetalle(causa);
  }

  /**
   * Alta de una causa con su responsable, colaboradores y partes, en una transacción, con
   * estado En trámite por defecto y registro de quién la creó (RF-2, RF-6, RF-29).
   */
  async create(actor: Usuario, dto: CreateCausaDto): Promise<ResultadoAlta> {
    const colaboradorIds = dto.colaboradorIds ?? [];
    await this.assertLawyers({ responsableId: dto.responsableId, colaboradorIds }, null);

    const partes: CreateParteDto[] = [];
    const identities: PartyIdentity[] = [];
    for (const raw of dto.partes) {
      const result = await validateCreateParte(raw);
      if (!result.parte) throw new BadRequestException(result.messages);
      identities.push(await this.partes.resolveNewParty(result.parte, identities));
      partes.push(result.parte);
    }

    const numeroExpediente = dto.numeroExpediente ?? null;
    await this.checkCaseNumber(
      {
        numeroExpediente,
        juzgado: dto.juzgado ?? null,
        fuero: dto.fuero,
        esIncidente: dto.esIncidente ?? false,
      },
      null,
      dto.confirmarExpedienteRepetido === true,
    );

    const id = await this.saveTranslatingDuplicate(async (manager) => {
      const causa = await manager.save(Causa, {
        caratula: dto.caratula,
        numeroExpediente,
        numeroExpedienteBusqueda: numeroExpediente && toSearchableCaseNumber(numeroExpediente),
        juzgado: dto.juzgado ?? null,
        fuero: dto.fuero,
        estado: dto.estado ?? 'en_tramite',
        esIncidente: dto.esIncidente ?? false,
        expedientePrincipal: dto.expedientePrincipal ?? null,
        activa: true,
        responsableId: dto.responsableId,
        creadoPorId: actor.id,
      });
      await manager.save(
        Parte,
        partes.map((parte) => toParteRow(parte, causa.id, actor.id)),
      );
      await manager.save(
        Colaborador,
        colaboradorIds.map((usuarioId) => ({ causaId: causa.id, usuarioId })),
      );
      return causa.id;
    });

    return { causa: await this.findOne(id), rechazos: [], causasComoNoCliente: [] };
  }

  /**
   * Control de expediente (RF-8 a RF-10). Un incidente o una causa sin número no se
   * controlan. Primero, el duplicado exacto en el mismo juzgado y fuero, que se rechaza
   * aunque se haya confirmado; después, el mismo número en cualquier otra causa activa no
   * incidente, que se pregunta. La intercalación de la base compara sin distinguir
   * mayúsculas ni tildes; el número se compara tal como se escribió.
   */
  private async checkCaseNumber(
    data: Omit<CaseKeyData, 'activa'>,
    exceptId: number | null,
    confirmed: boolean,
  ): Promise<void> {
    if (data.numeroExpediente === null || data.esIncidente) return;
    const others = exceptId === null ? {} : { id: Not(exceptId) };

    const key = caseKey({ ...data, activa: true });
    if (
      key !== null &&
      (await this.causas.exists({ where: { claveExpediente: key, ...others } }))
    ) {
      throw new ConflictException(CAUSAS_MESSAGES.duplicateCaseNumber);
    }
    const repeated = await this.causas.exists({
      where: {
        numeroExpediente: data.numeroExpediente,
        activa: true,
        esIncidente: false,
        ...others,
      },
    });
    if (repeated && !confirmed) {
      throw new ConflictException({
        statusCode: 409,
        message: CAUSAS_MESSAGES.repeatedCaseNumber,
        codigo: QUESTION_CODES.repeatedCaseNumber,
      });
    }
  }

  /**
   * Transacción de guardado. Si dos guardados simultáneos pasan checkCaseNumber, el índice
   * único rechaza el segundo y se responde el mismo 409 que en el caso común (RF-8).
   */
  private async saveTranslatingDuplicate<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction(work);
    } catch (error) {
      const driverError = error instanceof QueryFailedError ? error.driverError : undefined;
      if (
        driverError?.code === 'ER_DUP_ENTRY' &&
        String(driverError.message).includes(CASE_NUMBER_INDEX)
      ) {
        throw new ConflictException(CAUSAS_MESSAGES.duplicateCaseNumber);
      }
      throw error;
    }
  }

  /** RF-29 a RF-32: responsable y colaboradores, contra los asignados actuales si los hay. */
  private async assertLawyers(
    next: LawyerAssignment,
    current: LawyerAssignment | null,
  ): Promise<void> {
    const ids = [next.responsableId, ...next.colaboradorIds];
    const members = await this.users.find({ where: { id: In(ids) } });
    throwIfDenied(
      checkLawyers(next, new Map(members.map((member) => [member.id, member])), current),
    );
  }
}
