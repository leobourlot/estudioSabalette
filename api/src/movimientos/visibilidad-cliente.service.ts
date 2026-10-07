import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientLinkService } from '../causas/vinculo-cliente.service.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { type MovimientoCliente, toMovimientoCliente } from './movimiento-detalle.js';
import { Movimiento } from './movimiento.entity.js';
import { MOVIMIENTOS_MESSAGES } from './movimientos.service.js';

const PAGE_SIZE = 20;

export interface MovimientoClientePage {
  items: MovimientoCliente[];
  total: number;
  pagina: number;
  porPagina: number;
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
   * ver la causa: la spec 004 decide la respuesta.
   */
  async listVisible(
    clienteId: number,
    causaId: number,
    pagina = 1,
  ): Promise<MovimientoClientePage | null> {
    if (!(await this.canSeeCausa(clienteId, causaId))) return null;
    const [movimientos, total] = await this.movimientos.findAndCount({
      where: { causaId, visible: true },
      order: { fecha: 'DESC', creadoEn: 'DESC', id: 'DESC' },
      skip: (pagina - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    return { items: movimientos.map(toMovimientoCliente), total, pagina, porPagina: PAGE_SIZE };
  }

  /**
   * Un movimiento que el cliente puede ver. Si está oculto, es de una causa a la que no está
   * vinculado o no existe, responde siempre el mismo 404, sin revelar cuál de los casos es
   * (RF-33).
   */
  async findVisible(clienteId: number, movimientoId: number): Promise<MovimientoCliente> {
    const movimiento = await this.movimientos.findOneBy({ id: movimientoId, visible: true });
    if (!movimiento || !(await this.canSeeCausa(clienteId, movimiento.causaId))) {
      throw new NotFoundException(MOVIMIENTOS_MESSAGES.notFound);
    }
    return toMovimientoCliente(movimiento);
  }

  private async canSeeCausa(clienteId: number, causaId: number): Promise<boolean> {
    const activeClient = await this.usuarios.existsBy({
      id: clienteId,
      rol: 'cliente',
      activo: true,
    });
    return activeClient && this.links.isLinked(clienteId, causaId);
  }
}
