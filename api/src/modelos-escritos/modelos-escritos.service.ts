import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { QUESTION_CODES, QuestionException } from '../causas/preguntas.js';
import type { Usuario } from '../usuarios/usuario.entity.js';
import type { CreateModeloDto } from './dto/crear-modelo.dto.js';
import { type ModeloDetalle, toModeloDetalle, toModeloReferencia } from './modelo-detalle.js';
import { ModeloEscrito } from './modelo-escrito.entity.js';

export const MODELOS_MESSAGES = {
  notFound: 'No existe ese modelo',
  repeatedTitle: 'Ya existe un modelo con ese título',
} as const;

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

  /** Consulta de un modelo con su texto y su autoría, activo o desactivado (RF-16, RF-26). */
  async findOne(id: number): Promise<ModeloDetalle> {
    const modelo = await this.modelos.findOne({ where: { id }, relations: DETAIL_RELATIONS });
    if (!modelo) throw new NotFoundException(MODELOS_MESSAGES.notFound);
    return toModeloDetalle(modelo);
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
