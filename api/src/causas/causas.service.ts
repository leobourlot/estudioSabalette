import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
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
import { checkLawyers, type LawyerAssignment, type RuleDecision } from './reglas-causas.js';
import { toSearchableCaseNumber } from './validadores/texto-causa.js';

export const CAUSAS_MESSAGES = {
  notFound: 'No existe esa causa',
} as const;

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
    for (const raw of dto.partes) {
      const result = await validateCreateParte(raw);
      if (!result.parte) throw new BadRequestException(result.messages);
      partes.push(result.parte);
    }

    const numeroExpediente = dto.numeroExpediente ?? null;
    const id = await this.dataSource.transaction(async (manager) => {
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
