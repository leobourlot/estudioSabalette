import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Causa } from '../causas/causa.entity.js';
import { ClientLinkService } from '../causas/vinculo-cliente.service.js';
import { MOVIMIENTOS_MESSAGES } from '../movimientos/movimientos.service.js';
import { todayInBuenosAires } from '../movimientos/reglas-movimientos.js';
import { ClientVisibilityService } from '../movimientos/visibilidad-cliente.service.js';
import {
  type CausaPortalDetalle,
  type CausaPortalResumen,
  toCausaPortalDetalle,
  toCausaPortalResumen,
} from './portal-detalle.js';
import { comparePortalCausas, pageOf, type PortalPage } from './reglas-portal.js';

const PAGE_SIZE = 20;

/**
 * Portal del cliente (plan 004). No tiene reglas propias de acceso: qué causas ve un cliente
 * lo decide ClientLinkService (spec 002, RF-26) y qué movimientos, ClientVisibilityService
 * (spec 003, RF-30), en cada petición (RF-3).
 */
@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Causa) private readonly causas: Repository<Causa>,
    private readonly links: ClientLinkService,
    private readonly visibility: ClientVisibilityService,
  ) {}

  /**
   * Causas vinculadas al cliente, de cualquier estado (RF-7), en el orden de RF-10 y RF-11 y
   * de a 20, sin totales (RF-24). Se ordenan y paginan en memoria: la spec acota a 100 causas
   * por cliente, y así el orden queda en una función pura.
   */
  async listCausas(
    clienteId: number,
    pagina: number,
    ahora: Date = new Date(),
  ): Promise<PortalPage<CausaPortalResumen>> {
    const ids = await this.links.linkedCausaIds(clienteId);
    if (ids.length === 0) return { items: [], pagina, haySiguiente: false };

    const causas = await this.causas.find({
      select: { id: true, caratula: true, numeroExpediente: true, estado: true },
      where: { id: In(ids) },
    });
    const fechas = await this.visibility.lastVisibleDates(ids, todayInBuenosAires(ahora));
    const filas = causas
      .map((causa) => toCausaPortalResumen(causa, fechas.get(causa.id) ?? null))
      .sort(comparePortalCausas);
    return pageOf(filas, pagina, PAGE_SIZE);
  }

  /**
   * Detalle de una causa vinculada: sus datos, sus partes vigentes y el responsable activo
   * (RF-13 a RF-17). Una causa no vinculada, desactivada o inexistente responde siempre el
   * mismo 404 (RF-28).
   */
  async getCausa(clienteId: number, causaId: number): Promise<CausaPortalDetalle> {
    await this.assertCanSeeCausa(clienteId, causaId);
    const causa = await this.causas.findOne({
      where: { id: causaId },
      relations: { responsable: true, partes: { cliente: { usuario: true } } },
    });
    if (!causa) throw new NotFoundException(MOVIMIENTOS_MESSAGES.causaNotFound);
    return toCausaPortalDetalle(causa, clienteId);
  }

  private async assertCanSeeCausa(clienteId: number, causaId: number): Promise<void> {
    if (!(await this.visibility.canSeeCausa(clienteId, causaId))) {
      throw new NotFoundException(MOVIMIENTOS_MESSAGES.causaNotFound);
    }
  }
}
