import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, type EntityManager, Repository } from 'typeorm';
import { Causa } from '../causas/causa.entity.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import { CambioMovimiento } from './cambio-movimiento.entity.js';
import type { CreateMovimientoDto } from './dto/crear-movimiento.dto.js';
import type { ListMovimientosQueryDto } from './dto/listar-movimientos.dto.js';
import type { UpdateMovimientoDto } from './dto/modificar-movimiento.dto.js';
import {
  type MovimientoDetalle,
  type MovimientoResumen,
  toMovimientoDetalle,
  toMovimientoResumen,
} from './movimiento-detalle.js';
import { Movimiento } from './movimiento.entity.js';
import { diffMovement, loadChanges, type MovementData } from './reglas-movimientos.js';

export const MOVIMIENTOS_MESSAGES = {
  causaNotFound: 'No existe esa causa',
  notFound: 'No existe ese movimiento',
  causaDeactivated: 'La causa está desactivada',
  annulled: 'El movimiento está anulado. Restauralo para modificarlo',
  alreadyAnnulled: 'El movimiento ya está anulado',
  notAnnulled: 'El movimiento no está anulado',
} as const;

/** Datos del movimiento que registra el historial de cambios (RF-20). */
const snapshot = (movimiento: Movimiento): MovementData => ({
  fecha: movimiento.fecha,
  tipo: movimiento.tipo,
  descripcion: movimiento.descripcion,
  textoCliente: movimiento.textoCliente,
  visible: movimiento.visible,
  anulado: movimiento.anulado,
});

const PAGE_SIZE = 20;

/** Escapa los comodines de LIKE, para que % y _ se busquen como texto. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export interface MovimientoPage {
  items: MovimientoResumen[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** Relaciones que necesita toMovimientoDetalle. */
const DETAIL_RELATIONS = { creadoPor: true, modificadoPor: true, cambios: { usuario: true } };

/**
 * Movimientos de las causas (plan 003). Nunca escribe en `causas`: cargar, modificar, anular
 * o restaurar un movimiento no es una modificación de la causa (RF-10).
 */
@Injectable()
export class MovimientosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Movimiento) private readonly movimientos: Repository<Movimiento>,
    @InjectRepository(Causa) private readonly causas: Repository<Causa>,
  ) {}

  /**
   * Carga un movimiento (RF-8): no visible salvo que se lo marque, con su autor y el cambio
   * de carga con todos los valores iniciales (RF-20), en la misma transacción.
   */
  async create(
    actor: Usuario,
    causaId: number,
    dto: CreateMovimientoDto,
  ): Promise<MovimientoDetalle> {
    const id = await this.withActiveCausa(causaId, async (manager) => {
      const ahora = new Date();
      const data: MovementData = {
        fecha: dto.fecha,
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        textoCliente: dto.textoCliente ?? null,
        visible: dto.visible ?? false,
        anulado: false,
      };
      const movimiento = await manager.save(
        manager.create(Movimiento, {
          ...data,
          tipo: dto.tipo,
          causaId,
          creadoPorId: actor.id,
          creadoEn: ahora,
        }),
      );
      await manager.insert(CambioMovimiento, {
        movimientoId: movimiento.id,
        accion: 'carga',
        usuarioId: actor.id,
        fechaHora: ahora,
        cambios: loadChanges(data),
      });
      return movimiento.id;
    });
    return this.findOne(causaId, id);
  }

  /**
   * Modifica los datos o la visibilidad de un movimiento no anulado (RF-11, RF-14). Registra
   * la modificación y el cambio con los datos que cambiaron (RF-2, RF-20). Un PATCH que no
   * cambia nada no deja rastro: no es una modificación.
   */
  async update(
    actor: Usuario,
    causaId: number,
    movimientoId: number,
    dto: UpdateMovimientoDto,
  ): Promise<MovimientoDetalle> {
    await this.withMovement(causaId, movimientoId, async (manager, movimiento) => {
      if (movimiento.anulado) throw new ConflictException(MOVIMIENTOS_MESSAGES.annulled);
      const antes = snapshot(movimiento);
      const despues: MovementData = {
        ...antes,
        fecha: dto.fecha ?? antes.fecha,
        tipo: dto.tipo ?? antes.tipo,
        descripcion: dto.descripcion ?? antes.descripcion,
        textoCliente: dto.textoCliente === undefined ? antes.textoCliente : dto.textoCliente,
        visible: dto.visible ?? antes.visible,
      };
      const cambios = diffMovement(antes, despues);
      if (cambios.length === 0) return;

      const ahora = new Date();
      await manager.update(Movimiento, movimiento.id, {
        fecha: despues.fecha,
        tipo: dto.tipo ?? movimiento.tipo,
        descripcion: despues.descripcion,
        textoCliente: despues.textoCliente,
        visible: despues.visible,
        modificadoPorId: actor.id,
        modificadoEn: ahora,
      });
      await manager.insert(CambioMovimiento, {
        movimientoId: movimiento.id,
        accion: 'modificacion',
        usuarioId: actor.id,
        fechaHora: ahora,
        cambios,
      });
    });
    return this.findOne(causaId, movimientoId);
  }

  /**
   * Anula un movimiento (RF-16): conserva sus datos y su visibilidad, así un movimiento visible
   * se sigue viendo, marcado como anulado (RF-17). Nunca se borra.
   */
  annul(actor: Usuario, causaId: number, movimientoId: number): Promise<MovimientoDetalle> {
    return this.setAnnulled(actor, causaId, movimientoId, true);
  }

  /** Restaura un movimiento anulado, con la visibilidad que tenía (RF-18). */
  restore(actor: Usuario, causaId: number, movimientoId: number): Promise<MovimientoDetalle> {
    return this.setAnnulled(actor, causaId, movimientoId, false);
  }

  /** Anulación y restauración: registran la modificación y su cambio (RF-2, RF-20). */
  private async setAnnulled(
    actor: Usuario,
    causaId: number,
    movimientoId: number,
    anulado: boolean,
  ): Promise<MovimientoDetalle> {
    await this.withMovement(causaId, movimientoId, async (manager, movimiento) => {
      if (movimiento.anulado === anulado) {
        throw new ConflictException(
          anulado ? MOVIMIENTOS_MESSAGES.alreadyAnnulled : MOVIMIENTOS_MESSAGES.notAnnulled,
        );
      }
      const ahora = new Date();
      await manager.update(Movimiento, movimiento.id, {
        anulado,
        modificadoPorId: actor.id,
        modificadoEn: ahora,
      });
      await manager.insert(CambioMovimiento, {
        movimientoId: movimiento.id,
        accion: anulado ? 'anulacion' : 'restauracion',
        usuarioId: actor.id,
        fechaHora: ahora,
        cambios: [{ campo: 'anulado', anterior: !anulado, nuevo: anulado }],
      });
    });
    return this.findOne(causaId, movimientoId);
  }

  /**
   * Historial de movimientos de una causa, activa o desactivada (RF-23, RF-28), de a 20.
   * Orden: fecha del movimiento, momento de carga e id, siempre del más reciente al más
   * antiguo; el id es único, así ningún movimiento se repite ni se omite entre páginas. Los
   * filtros se combinan (RF-25). offset/limit (y no skip/take), como en el listado de causas:
   * la unión con el autor es muchos a uno y no multiplica filas.
   */
  async list(causaId: number, query: ListMovimientosQueryDto): Promise<MovimientoPage> {
    await this.findCausa(causaId);
    const pagina = query.pagina ?? 1;
    const builder = this.movimientos
      .createQueryBuilder('movimiento')
      .innerJoinAndSelect('movimiento.creadoPor', 'creadoPor')
      .where('movimiento.causaId = :causaId', { causaId });

    if (query.tipo !== undefined) builder.andWhere('movimiento.tipo = :tipo', { tipo: query.tipo });
    // "Visibles" incluye los anulados visibles, salvo con ocultarAnulados (RF-25).
    if (query.visibilidad === 'visibles') builder.andWhere('movimiento.visible = 1');
    if (query.visibilidad === 'ocultos') builder.andWhere('movimiento.visible = 0');
    // Las fechas AAAA-MM-DD se comparan como fechas; los extremos se incluyen.
    if (query.desde !== undefined)
      builder.andWhere('movimiento.fecha >= :desde', { desde: query.desde });
    if (query.hasta !== undefined)
      builder.andWhere('movimiento.fecha <= :hasta', { hasta: query.hasta });
    if (query.ocultarAnulados === true) builder.andWhere('movimiento.anulado = 0');
    // Buscador (RF-27): fragmentos de la descripción o del texto para el cliente. La
    // intercalación utf8mb4_unicode_ci compara sin distinguir mayúsculas ni tildes.
    if (query.buscar) {
      builder.andWhere(
        new Brackets((where) =>
          where
            .where('movimiento.descripcion LIKE :texto')
            .orWhere('movimiento.textoCliente LIKE :texto'),
        ),
        { texto: `%${escapeLike(query.buscar)}%` },
      );
    }

    const [movimientos, total] = await builder
      .orderBy('movimiento.fecha', 'DESC')
      .addOrderBy('movimiento.creadoEn', 'DESC')
      .addOrderBy('movimiento.id', 'DESC')
      .offset((pagina - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .getManyAndCount();

    const ahora = new Date();
    return {
      items: movimientos.map((movimiento) => toMovimientoResumen(movimiento, ahora)),
      total,
      pagina,
      porPagina: PAGE_SIZE,
    };
  }

  /**
   * Consulta de un movimiento con su auditoría y su historial de cambios (RF-22), también en
   * una causa desactivada (RF-28). Un movimiento de otra causa no existe (RF-34).
   */
  async findOne(causaId: number, movimientoId: number): Promise<MovimientoDetalle> {
    const causa = await this.findCausa(causaId);
    const movimiento = await this.movimientos.findOne({
      where: { id: movimientoId, causaId },
      relations: DETAIL_RELATIONS,
    });
    if (!movimiento) throw new NotFoundException(MOVIMIENTOS_MESSAGES.notFound);
    return toMovimientoDetalle(movimiento, causa.activa);
  }

  private async findCausa(causaId: number): Promise<Pick<Causa, 'id' | 'activa'>> {
    const causa = await this.causas.findOne({
      select: { id: true, activa: true },
      where: { id: causaId },
    });
    if (!causa) throw new NotFoundException(MOVIMIENTOS_MESSAGES.causaNotFound);
    return causa;
  }

  /**
   * Bloqueos (plan 003): toda escritura corre en una transacción que empieza con un bloqueo
   * compartido sobre la causa. La desactivación de la spec 002 toma uno exclusivo sobre la
   * misma fila, así que una desactivación y una escritura simultáneas se ejecutan de a una, y
   * si la desactivación queda primero la escritura se rechaza (RF-28). Varias escrituras de
   * movimientos de la misma causa no se bloquean entre sí.
   */
  protected withActiveCausa<T>(
    causaId: number,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const causa = await manager.findOne(Causa, {
        select: { id: true, activa: true },
        where: { id: causaId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!causa) throw new NotFoundException(MOVIMIENTOS_MESSAGES.causaNotFound);
      if (!causa.activa) throw new ConflictException(MOVIMIENTOS_MESSAGES.causaDeactivated);
      return work(manager);
    });
  }

  /**
   * Como withActiveCausa, y además bloquea el movimiento en modo exclusivo: una anulación y
   * una modificación simultáneas se ejecutan de a una (RF-15). Un movimiento de otra causa
   * no existe (RF-34).
   */
  protected withMovement<T>(
    causaId: number,
    movimientoId: number,
    work: (manager: EntityManager, movimiento: Movimiento) => Promise<T>,
  ): Promise<T> {
    return this.withActiveCausa(causaId, async (manager) => {
      const movimiento = await manager.findOne(Movimiento, {
        where: { id: movimientoId, causaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!movimiento) throw new NotFoundException(MOVIMIENTOS_MESSAGES.notFound);
      return work(manager, movimiento);
    });
  }
}
