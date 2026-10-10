import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { QUESTION_CODES, QuestionException } from '../causas/preguntas.js';
import { toSearchableCaseNumber } from '../causas/validadores/texto-causa.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { CreateFalloDto } from './dto/crear-fallo.dto.js';
import type { UpdateFalloDto } from './dto/modificar-fallo.dto.js';
import { type FalloDetalle, toFalloDetalle, toFalloReferencia } from './fallo-detalle.js';
import { FalloPalabraClave } from './fallo-palabra-clave.entity.js';
import { Fallo } from './fallo.entity.js';
import { PalabrasClaveService } from './palabras-clave.service.js';
import { repeatedRulingMessage } from './reglas-jurisprudencia.js';

/** Datos de un fallo que decide el aviso de repetido (RF-18). */
type RepeatedCheckData = Pick<Fallo, 'caratula' | 'tribunal' | 'numero' | 'fecha'>;

/** Datos de un fallo que se pueden modificar (RF-17), sin las palabras clave. */
type RulingData = Pick<
  Fallo,
  'caratula' | 'tribunal' | 'fuero' | 'fecha' | 'numero' | 'sumario' | 'enlace'
>;

const RULING_FIELDS = [
  'caratula',
  'tribunal',
  'fuero',
  'fecha',
  'numero',
  'sumario',
  'enlace',
] as const satisfies readonly (keyof RulingData)[];

const REPEATED_CHECK_FIELDS = [
  'caratula',
  'tribunal',
  'numero',
  'fecha',
] as const satisfies readonly (keyof RepeatedCheckData)[];

const snapshot = (fallo: Fallo): RulingData => ({
  caratula: fallo.caratula,
  tribunal: fallo.tribunal,
  fuero: fallo.fuero,
  fecha: fallo.fecha,
  numero: fallo.numero,
  sumario: fallo.sumario,
  enlace: fallo.enlace,
});

/** Las dos listas tienen los mismos textos, sin importar el orden. */
function sameTexts(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = [...b].sort();
  return [...a].sort().every((texto, index) => texto === sorted[index]);
}

export const JURISPRUDENCIA_MESSAGES = {
  notFound: 'No existe ese fallo',
  deactivated: 'El fallo está desactivado. Reactivalo para modificarlo',
  alreadyDeactivated: 'El fallo ya está desactivado',
  alreadyActive: 'El fallo ya está activo',
} as const;

/** Relaciones que necesita toFalloDetalle. */
const DETAIL_RELATIONS = {
  creadoPor: true,
  modificadoPor: true,
  palabrasClave: { palabraClave: true },
};

/** El número sin separadores, para la búsqueda (RF-23); null si el fallo no tiene número. */
const searchableNumber = (numero: string | null) =>
  numero === null ? null : toSearchableCaseNumber(numero);

/** Fallos del registro de jurisprudencia (plan 005). */
@Injectable()
export class JurisprudenciaService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Fallo) private readonly fallos: Repository<Fallo>,
    private readonly palabrasClave: PalabrasClaveService,
  ) {}

  /**
   * Carga un fallo activo con su autor (RF-16). Las palabras clave se resuelven contra el
   * catálogo en la misma transacción que guarda el fallo: si algo falla, no queda ninguna
   * palabra nueva (RF-12).
   */
  async create(actor: Usuario, dto: CreateFalloDto): Promise<FalloDetalle> {
    // La pregunta de repetido va antes de escribir nada: un 409 no deja palabras nuevas en
    // el catálogo (RF-12, RF-18).
    if (dto.confirmarRepetido !== true) {
      await this.askIfRepeated(this.dataSource.manager, {
        caratula: dto.caratula,
        tribunal: dto.tribunal,
        numero: dto.numero ?? null,
        fecha: dto.fecha,
      });
    }
    const id = await this.dataSource.transaction(async (manager) => {
      const palabraIds = await this.palabrasClave.resolve(manager, dto.palabrasClave);
      const numero = dto.numero ?? null;
      const fallo = await manager.save(
        manager.create(Fallo, {
          caratula: dto.caratula,
          tribunal: dto.tribunal,
          fuero: dto.fuero,
          fecha: dto.fecha,
          numero,
          numeroBusqueda: searchableNumber(numero),
          sumario: dto.sumario,
          enlace: dto.enlace ?? null,
          activo: true,
          creadoPorId: actor.id,
          creadoEn: new Date(),
        }),
      );
      await manager.insert(
        FalloPalabraClave,
        palabraIds.map((palabraClaveId) => ({ falloId: fallo.id, palabraClaveId })),
      );
      return fallo.id;
    });
    return this.findOne(id);
  }

  /**
   * Modifica los datos o las palabras clave de un fallo activo (RF-17) y registra quién lo
   * hizo (RF-2). El aviso de repetido se controla solo si cambia la carátula, el tribunal, el
   * número o la fecha (RF-18). Un PATCH que no cambia nada no deja rastro: no es una
   * modificación.
   */
  async update(actor: Usuario, id: number, dto: UpdateFalloDto): Promise<FalloDetalle> {
    await this.withLockedFallo(id, async (manager, fallo) => {
      if (!fallo.activo) throw new ConflictException(JURISPRUDENCIA_MESSAGES.deactivated);
      const antes = snapshot(fallo);
      const despues: RulingData = {
        caratula: dto.caratula ?? antes.caratula,
        tribunal: dto.tribunal ?? antes.tribunal,
        fuero: dto.fuero ?? antes.fuero,
        fecha: dto.fecha ?? antes.fecha,
        // null borra el número o el enlace; ausente, no cambia.
        numero: dto.numero === undefined ? antes.numero : dto.numero,
        sumario: dto.sumario ?? antes.sumario,
        enlace: dto.enlace === undefined ? antes.enlace : dto.enlace,
      };
      const changed = (campos: readonly (keyof RulingData)[]) =>
        campos.some((campo) => antes[campo] !== despues[campo]);

      // La pregunta va antes de escribir nada: un 409 no deja cambios ni palabras nuevas.
      if (changed(REPEATED_CHECK_FIELDS) && dto.confirmarRepetido !== true) {
        await this.askIfRepeated(manager, despues, id);
      }

      const keywordsChanged =
        dto.palabrasClave !== undefined &&
        !sameTexts(dto.palabrasClave, await this.keywordTexts(manager, id));
      if (!changed(RULING_FIELDS) && !keywordsChanged) return;

      if (keywordsChanged) {
        const palabraIds = await this.palabrasClave.resolve(manager, dto.palabrasClave!);
        await manager.delete(FalloPalabraClave, { falloId: id });
        await manager.insert(
          FalloPalabraClave,
          palabraIds.map((palabraClaveId) => ({ falloId: id, palabraClaveId })),
        );
      }
      await manager.update(Fallo, id, {
        ...despues,
        numeroBusqueda: searchableNumber(despues.numero),
        modificadoPorId: actor.id,
        modificadoEn: new Date(),
      });
    });
    return this.findOne(id);
  }

  /** Consulta de un fallo con sus palabras clave y su autoría, activo o desactivado (RF-19, RF-30). */
  async findOne(id: number): Promise<FalloDetalle> {
    const fallo = await this.fallos.findOne({ where: { id }, relations: DETAIL_RELATIONS });
    if (!fallo) throw new NotFoundException(JURISPRUDENCIA_MESSAGES.notFound);
    return toFalloDetalle(
      fallo,
      fallo.palabrasClave.map((relacion) => relacion.palabraClave),
    );
  }

  /** Textos actuales de las palabras clave de un fallo. */
  private async keywordTexts(manager: EntityManager, falloId: number): Promise<string[]> {
    const relaciones = await manager.find(FalloPalabraClave, {
      where: { falloId },
      relations: { palabraClave: true },
    });
    return relaciones.map((relacion) => relacion.palabraClave.texto);
  }

  /**
   * Bloqueo del fallo (plan 005): modificar, desactivar y reactivar corren en una transacción
   * que empieza con un bloqueo exclusivo sobre su fila. Así una desactivación y una
   * modificación simultáneas se ejecutan de a una, y si la desactivación queda primero la
   * modificación se rechaza (RF-30).
   */
  private withLockedFallo<T>(
    id: number,
    work: (manager: EntityManager, fallo: Fallo) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const fallo = await manager.findOne(Fallo, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fallo) throw new NotFoundException(JURISPRUDENCIA_MESSAGES.notFound);
      return work(manager, fallo);
    });
  }

  /**
   * Aviso de repetido (RF-18): si el fallo coincide con otro activo, pregunta con un 409
   * FALLO_REPETIDO que lleva los datos de ese fallo. La interfaz repite la petición con
   * `confirmarRepetido: true` si el integrante lo confirma.
   */
  private async askIfRepeated(
    manager: EntityManager,
    data: RepeatedCheckData,
    exceptId?: number,
  ): Promise<void> {
    const repeated = await this.findRepeated(manager, data, exceptId);
    if (!repeated) return;
    throw new QuestionException(
      QUESTION_CODES.repeatedRuling,
      repeatedRulingMessage(repeated.porNumero),
      { fallo: toFalloReferencia(repeated.fallo) },
    );
  }

  /**
   * Primer fallo activo, en el orden del listado (RF-21), con el que coincide: por tribunal y
   * número si el fallo tiene número; si no coincide por número, por carátula, tribunal y
   * fecha, tengan o no número. La intercalación utf8mb4_unicode_ci compara sin distinguir
   * mayúsculas, minúsculas, tildes ni diéresis, y con la ñ como n (RF-9). El número se
   * compara tal como se escribió, sin quitar separadores. `exceptId` es el propio fallo.
   */
  private async findRepeated(
    manager: EntityManager,
    data: RepeatedCheckData,
    exceptId?: number,
  ): Promise<{ fallo: Fallo; porNumero: boolean } | null> {
    const base = () => {
      const builder = manager.createQueryBuilder(Fallo, 'fallo').where('fallo.activo = 1');
      if (exceptId !== undefined) builder.andWhere('fallo.id <> :exceptId', { exceptId });
      return builder
        .orderBy('fallo.fecha', 'DESC')
        .addOrderBy('fallo.creadoEn', 'DESC')
        .addOrderBy('fallo.id', 'DESC')
        .limit(1);
    };

    if (data.numero !== null) {
      const byNumber = await base()
        .andWhere('fallo.tribunal = :tribunal AND fallo.numero = :numero', {
          tribunal: data.tribunal,
          numero: data.numero,
        })
        .getOne();
      if (byNumber) return { fallo: byNumber, porNumero: true };
    }
    const byCaption = await base()
      .andWhere(
        'fallo.caratula = :caratula AND fallo.tribunal = :tribunal AND fallo.fecha = :fecha',
        { caratula: data.caratula, tribunal: data.tribunal, fecha: data.fecha },
      )
      .getOne();
    return byCaption ? { fallo: byCaption, porNumero: false } : null;
  }
}
