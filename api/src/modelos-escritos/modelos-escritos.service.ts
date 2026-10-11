import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import type { Fuero } from '../causas/causa.entity.js';
import { QUESTION_CODES, QuestionException } from '../causas/preguntas.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { CreateModeloDto } from './dto/crear-modelo.dto.js';
import type { ListModelosQueryDto } from './dto/listar-modelos.dto.js';
import type { UpdateModeloDto } from './dto/modificar-modelo.dto.js';
import {
  type ModeloDetalle,
  type ModeloResumen,
  toModeloDetalle,
  toModeloReferencia,
  toModeloResumen,
} from './modelo-detalle.js';
import { ModeloEscrito } from './modelo-escrito.entity.js';

export const MODELOS_MESSAGES = {
  notFound: 'No existe ese modelo',
  repeatedTitle: 'Ya existe un modelo con ese título',
  deactivated: 'El modelo está desactivado. Reactivalo para modificarlo',
  alreadyDeactivated: 'El modelo ya está desactivado',
  alreadyActive: 'El modelo ya está activo',
} as const;

const PAGE_SIZE = 20;

/** Fuero de los modelos que no son de un fuero específico (RF-1). */
const GENERAL_FUERO: Fuero = 'otro';

/** Columnas del listado: todas las de ModeloResumen, sin el texto (RF-19). */
const LIST_COLUMNS = [
  'id',
  'titulo',
  'tipo',
  'fuero',
  'descripcion',
  'activo',
] as const satisfies readonly (keyof ModeloResumen)[];

/** Página del listado (RF-18). No lleva totales: la paginación se resuelve con haySiguiente. */
export interface ModeloPage {
  items: ModeloResumen[];
  pagina: number;
  haySiguiente: boolean;
  /** Si existe algún modelo que pueda aparecer sin buscador ni filtros (RF-23). */
  hayModelos: boolean;
}

/** Datos de un modelo que se pueden modificar (RF-14). */
type ModelData = Pick<ModeloEscrito, 'titulo' | 'tipo' | 'fuero' | 'descripcion' | 'texto'>;

const MODEL_FIELDS = [
  'titulo',
  'tipo',
  'fuero',
  'descripcion',
  'texto',
] as const satisfies readonly (keyof ModelData)[];

const snapshot = (modelo: ModeloEscrito): ModelData => ({
  titulo: modelo.titulo,
  tipo: modelo.tipo,
  fuero: modelo.fuero,
  descripcion: modelo.descripcion,
  texto: modelo.texto,
});

/** Relaciones que necesita toModeloDetalle. */
const DETAIL_RELATIONS = { creadoPor: true, modificadoPor: true };

/** Modelos de escritos del estudio (plan 006). */
@Injectable()
export class ModelosEscritosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ModeloEscrito) private readonly modelos: Repository<ModeloEscrito>,
  ) {}

  /**
   * Carga un modelo activo con su autor (RF-13). Los textos ya llegan convertidos y con las
   * marcas en la forma del catálogo desde el DTO. Sin fuero, queda como "otro" (RF-1).
   */
  async create(actor: Usuario, dto: CreateModeloDto): Promise<ModeloDetalle> {
    if (dto.confirmarRepetido !== true) {
      await this.askIfRepeated(this.dataSource.manager, dto.titulo);
    }
    const modelo = await this.modelos.save(
      this.modelos.create({
        titulo: dto.titulo,
        tipo: dto.tipo,
        fuero: dto.fuero ?? 'otro',
        descripcion: dto.descripcion ?? null,
        texto: dto.texto,
        activo: true,
        creadoPorId: actor.id,
        creadoEn: new Date(),
      }),
    );
    return this.findOne(modelo.id);
  }

  /**
   * Modifica los datos de un modelo activo (RF-14) y registra quién lo hizo (RF-2). El aviso
   * de título repetido se controla solo si cambia el título (RF-15). Un PATCH que no cambia
   * nada no deja rastro: no es una modificación.
   */
  async update(actor: Usuario, id: number, dto: UpdateModeloDto): Promise<ModeloDetalle> {
    await this.withLockedModelo(id, async (manager, modelo) => {
      if (!modelo.activo) throw new ConflictException(MODELOS_MESSAGES.deactivated);
      const antes = snapshot(modelo);
      const despues: ModelData = {
        titulo: dto.titulo ?? antes.titulo,
        tipo: dto.tipo ?? antes.tipo,
        fuero: dto.fuero ?? antes.fuero,
        // null borra la descripción; ausente, no cambia.
        descripcion: dto.descripcion === undefined ? antes.descripcion : dto.descripcion,
        texto: dto.texto ?? antes.texto,
      };

      // La pregunta va antes de escribir nada: un 409 no deja cambios.
      if (despues.titulo !== antes.titulo && dto.confirmarRepetido !== true) {
        await this.askIfRepeated(manager, despues.titulo, id);
      }
      if (MODEL_FIELDS.every((campo) => antes[campo] === despues[campo])) return;

      await manager.update(ModeloEscrito, id, {
        ...despues,
        modificadoPorId: actor.id,
        modificadoEn: new Date(),
      });
    });
    return this.findOne(id);
  }

  /**
   * Desactiva un modelo (RF-25): reemplaza al borrado. Cuenta como modificación (RF-2). Deja
   * de aparecer en el listado normal y de ofrecerse en las causas, porque esas consultas solo
   * traen modelos activos.
   */
  async deactivate(actor: Usuario, id: number): Promise<ModeloDetalle> {
    await this.withLockedModelo(id, async (manager, modelo) => {
      if (!modelo.activo) throw new ConflictException(MODELOS_MESSAGES.alreadyDeactivated);
      await manager.update(ModeloEscrito, id, {
        activo: false,
        modificadoPorId: actor.id,
        modificadoEn: new Date(),
      });
    });
    return this.findOne(id);
  }

  /**
   * Reactiva un modelo (RF-27). Si su título coincide con el de otro modelo activo, primero
   * pregunta, como en la carga (RF-15).
   */
  async reactivate(actor: Usuario, id: number, confirmado: boolean): Promise<ModeloDetalle> {
    await this.withLockedModelo(id, async (manager, modelo) => {
      if (modelo.activo) throw new ConflictException(MODELOS_MESSAGES.alreadyActive);
      if (!confirmado) await this.askIfRepeated(manager, modelo.titulo, id);
      await manager.update(ModeloEscrito, id, {
        activo: true,
        modificadoPorId: actor.id,
        modificadoEn: new Date(),
      });
    });
    return this.findOne(id);
  }

  /**
   * Listado de modelos, de a 20 (RF-18). Orden: título y, a igual título, primero el último
   * registrado; el id es único, así ningún modelo se repite ni se omite entre páginas. La
   * intercalación utf8mb4_unicode_ci ordena sin distinguir mayúsculas, minúsculas ni tildes.
   * Nunca trae el texto (RF-19). Los filtros se combinan y no cambian el orden (RF-22).
   *
   * Se pide una fila de más para saber si hay página siguiente, sin contar el total: la spec
   * no lo pide, y contarlo repetiría la búsqueda sobre todos los textos.
   */
  async list(query: ListModelosQueryDto): Promise<ModeloPage> {
    const pagina = query.pagina ?? 1;
    const incluirDesactivados = query.incluirDesactivados === true;
    const builder = this.modelos
      .createQueryBuilder('modelo')
      .select(LIST_COLUMNS.map((column) => `modelo.${column}`));

    if (!incluirDesactivados) builder.andWhere('modelo.activo = 1');
    if (query.tipo !== undefined) builder.andWhere('modelo.tipo = :tipo', { tipo: query.tipo });
    // Los modelos de fuero "otro" no son de un fuero específico: se ven con cualquier fuero
    // elegido. Con "otro", solo esos (RF-22).
    if (query.fuero === GENERAL_FUERO) {
      builder.andWhere('modelo.fuero = :general', { general: GENERAL_FUERO });
    } else if (query.fuero !== undefined) {
      builder.andWhere('(modelo.fuero = :fuero OR modelo.fuero = :general)', {
        fuero: query.fuero,
        general: GENERAL_FUERO,
      });
    }

    const filas = await builder
      .orderBy('modelo.titulo', 'ASC')
      .addOrderBy('modelo.id', 'DESC')
      .offset((pagina - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE + 1)
      .getMany();
    const modelos = filas.slice(0, PAGE_SIZE);

    return {
      items: modelos.map(toModeloResumen),
      pagina,
      haySiguiente: filas.length > PAGE_SIZE,
      // Solo hace falta para elegir el mensaje de una página vacía (RF-23).
      hayModelos: modelos.length > 0 || (await this.anyModel(incluirDesactivados)),
    };
  }

  /**
   * Si existe algún modelo que pueda aparecer en el listado sin buscador ni filtros: activo o,
   * con "Mostrar desactivados", cualquiera (RF-23).
   */
  private async anyModel(incluirDesactivados: boolean): Promise<boolean> {
    const builder = this.modelos.createQueryBuilder('modelo').select('modelo.id');
    if (!incluirDesactivados) builder.where('modelo.activo = 1');
    return (await builder.limit(1).getRawOne()) !== undefined;
  }

  /** Consulta de un modelo con su texto y su autoría, activo o desactivado (RF-16, RF-26). */
  async findOne(id: number): Promise<ModeloDetalle> {
    const modelo = await this.modelos.findOne({ where: { id }, relations: DETAIL_RELATIONS });
    if (!modelo) throw new NotFoundException(MODELOS_MESSAGES.notFound);
    return toModeloDetalle(modelo);
  }

  /**
   * Bloqueo del modelo (plan 006): modificar, desactivar y reactivar corren en una transacción
   * que empieza con un bloqueo exclusivo sobre su fila. Así una desactivación y una
   * modificación simultáneas se ejecutan de a una, y si la desactivación queda primero la
   * modificación se rechaza (RF-26).
   */
  private withLockedModelo<T>(
    id: number,
    work: (manager: EntityManager, modelo: ModeloEscrito) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const modelo = await manager.findOne(ModeloEscrito, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!modelo) throw new NotFoundException(MODELOS_MESSAGES.notFound);
      return work(manager, modelo);
    });
  }

  /**
   * Aviso de título repetido (RF-15): si el título coincide con el de otros modelos activos,
   * pregunta con un 409 MODELO_REPETIDO que los lleva a todos. La interfaz repite la petición
   * con `confirmarRepetido: true` si el integrante lo confirma.
   */
  private async askIfRepeated(
    manager: EntityManager,
    titulo: string,
    exceptId?: number,
  ): Promise<void> {
    const repeated = await this.findRepeated(manager, titulo, exceptId);
    if (repeated.length === 0) return;
    throw new QuestionException(QUESTION_CODES.repeatedTemplate, MODELOS_MESSAGES.repeatedTitle, {
      modelos: repeated.map(toModeloReferencia),
    });
  }

  /**
   * Modelos activos con el mismo título, en el orden del listado (RF-18). La intercalación
   * utf8mb4_unicode_ci compara sin distinguir mayúsculas, minúsculas, tildes ni diéresis, y con
   * la ñ como n: es la comparación flexible de la spec 005 (RF-9). `exceptId` es el propio
   * modelo, que nunca se compara consigo mismo.
   */
  private findRepeated(
    manager: EntityManager,
    titulo: string,
    exceptId?: number,
  ): Promise<ModeloEscrito[]> {
    const builder = manager
      .createQueryBuilder(ModeloEscrito, 'modelo')
      .select(['modelo.id', 'modelo.titulo', 'modelo.tipo', 'modelo.fuero'])
      .where('modelo.activo = 1')
      .andWhere('modelo.titulo = :titulo', { titulo });
    if (exceptId !== undefined) builder.andWhere('modelo.id <> :exceptId', { exceptId });
    return builder.orderBy('modelo.titulo', 'ASC').addOrderBy('modelo.id', 'DESC').getMany();
  }
}
