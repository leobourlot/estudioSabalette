import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientLinkService } from '../causas/vinculo-cliente.service.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { type MovimientoCliente, toMovimientoCliente } from './movimiento-detalle.js';
import { Movimiento } from './movimiento.entity.js';
import { MOVIMIENTOS_MESSAGES } from './movimientos.service.js';

const PAGE_SIZE = 20;

/**
 * Página de movimientos para un cliente. No lleva totales (spec 004, RF-24): `haySiguiente`
 * alcanza para paginar sin revelar cuántos movimientos hay.
 */
export interface MovimientoClientePage {
  items: MovimientoCliente[];
  pagina: number;
  haySiguiente: boolean;
}

/**
 * Única regla de qué movimientos ve un cliente (RF-30 a RF-33). Un cliente puede ver un
 * movimiento solo si está marcado como visible y el cliente está vinculado a su causa según
 * ClientLinkService (spec 002, RF-26 a RF-28). Además se exige que la cuenta del cliente esté
 * activa: la spec 001 ya corta su sesión, y esto lo repite como segunda barrera. La usa la
 * spec 004 en cada petición del portal; esta spec no tiene endpoints para clientes.
 */
@Injectable()
export class ClientVisibilityService {
  constructor(
    @InjectRepository(Movimiento) private readonly movimientos: Repository<Movimiento>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly links: ClientLinkService,
  ) {}

  /**
   * Movimientos visibles de una causa, anulados incluidos y cargados antes o después del
   * vínculo (RF-32), en el orden del historial (RF-23). Devuelve null si el cliente no puede
   * ver la causa: la spec 004 decide la respuesta. Cuenta y pagina solo los visibles, así los
   * ocultos no dejan rastro (spec 004, RF-26).
   */
  async listVisible(
    clienteId: number,
    causaId: number,
    pagina = 1,
    ahora: Date = new Date(),
  ): Promise<MovimientoClientePage | null> {
    if (!(await this.canSeeCausa(clienteId, causaId))) return null;
    // Una fila de más indica si hay página siguiente, sin contar el total.
    const movimientos = await this.movimientos.find({
      where: { causaId, visible: true },
      order: { fecha: 'DESC', creadoEn: 'DESC', id: 'DESC' },
      skip: (pagina - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    });
    return {
      items: movimientos.slice(0, PAGE_SIZE).map((m) => toMovimientoCliente(m, ahora)),
      pagina,
      haySiguiente: movimientos.length > PAGE_SIZE,
    };
  }

  /**
   * Un movimiento que el cliente puede ver, pedido dentro de su causa (spec 004, RF-27). Si está
   * oculto, es de una causa a la que no está vinculado, no pertenece a la causa indicada o no
   * existe, responde siempre el mismo 404, sin revelar cuál de los casos es (RF-33; spec 004,
   * RF-29).
   */
  async findVisible(
    clienteId: number,
    causaId: number,
    movimientoId: number,
    ahora: Date = new Date(),
  ): Promise<MovimientoCliente> {
    const movimiento = await this.movimientos.findOneBy({
      id: movimientoId,
      causaId,
      visible: true,
    });
    if (!movimiento || !(await this.canSeeCausa(clienteId, causaId))) {
      throw new NotFoundException(MOVIMIENTOS_MESSAGES.notFound);
    }
    return toMovimientoCliente(movimiento, ahora);
  }

  /**
   * Fecha del último movimiento de cada causa para un cliente (spec 004, RF-8): la más reciente
   * entre los visibles, sin contar los anulados ni los posteriores a `hoy` (AAAA-MM-DD). No
   * verifica el vínculo: recibe las causas ya resueltas con ClientLinkService. Las causas sin
   * ninguno no aparecen en el mapa.
   */
  async lastVisibleDates(causaIds: number[], hoy: string): Promise<Map<number, string>> {
    if (causaIds.length === 0) return new Map();
    const rows = await this.movimientos
      .createQueryBuilder('m')
      .select('m.causaId', 'causaId')
      .addSelect('MAX(m.fecha)', 'fecha')
      .where('m.causaId IN (:...causaIds)', { causaIds })
      .andWhere('m.visible = 1')
      .andWhere('m.anulado = 0')
      .andWhere('m.fecha <= :hoy', { hoy })
      .groupBy('m.causaId')
      .getRawMany<{ causaId: number | string; fecha: string }>();
    return new Map(rows.map((row) => [Number(row.causaId), row.fecha]));
  }

  /** Si el cliente, con la cuenta activa, está vinculado a la causa (spec 002, RF-26). */
  async canSeeCausa(clienteId: number, causaId: number): Promise<boolean> {
    const activeClient = await this.usuarios.existsBy({
      id: clienteId,
      rol: 'cliente',
      activo: true,
    });
    return activeClient && this.links.isLinked(clienteId, causaId);
  }
}
