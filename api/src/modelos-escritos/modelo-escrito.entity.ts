import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { type Fuero, JURISDICTIONS } from '../causas/causa.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { MAX_DESCRIPCION_LENGTH, MAX_TITULO_LENGTH } from './validadores/longitudes.js';

export const TEMPLATE_TYPES = [
  'demanda',
  'contestacion_demanda',
  'escrito_tramite',
  'recurso',
  'oficio',
  'cedula',
  'otro',
] as const;
export type TipoEscrito = (typeof TEMPLATE_TYPES)[number];

/**
 * Modelo de escrito (spec 006, RF-1). Nunca se borra: se desactiva (RF-25). Los textos se
 * guardan ya convertidos (RF-3), y el texto, con sus marcas de variable en la forma del
 * catálogo (RF-8). El índice del listado resuelve el filtro por activos, el orden por título
 * (RF-18) y la búsqueda de títulos repetidos (RF-15).
 */
@Entity('modelos_escritos')
@Index('IDX_modelos_escritos_listado', ['activo', 'titulo'])
export class ModeloEscrito {
  // También es el orden de registro en el sistema, el desempate de RF-18.
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: MAX_TITULO_LENGTH })
  titulo: string;

  @Column({ type: 'enum', enum: TEMPLATE_TYPES })
  tipo: TipoEscrito;

  // Los mismos valores que el fuero de una causa (spec 002, RF-1). Un modelo sin fuero
  // indicado queda como "otro": no es de un fuero específico y sirve para cualquier causa.
  @Column({ type: 'enum', enum: JURISDICTIONS, default: 'otro' })
  fuero: Fuero;

  // NULL si no se informa.
  @Column({ type: 'varchar', length: MAX_DESCRIPCION_LENGTH, nullable: true })
  descripcion: string | null;

  // Hasta 50.000 caracteres: en utf8mb4 pueden ocupar 200.000 bytes, más que una fila y que
  // una columna TEXT. El largo máximo lo garantiza el DTO.
  @Column({ type: 'mediumtext' })
  texto: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'int' })
  creadoPorId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Relation<Usuario>;

  // Lo asigna el service.
  @Column({ type: 'datetime', precision: 6 })
  creadoEn: Date;

  @Column({ type: 'int', nullable: true })
  modificadoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'modificadoPorId' })
  modificadoPor: Relation<Usuario> | null;

  // Cambio de datos, desactivación o reactivación (RF-2).
  @Column({ type: 'datetime', precision: 6, nullable: true })
  modificadoEn: Date | null;
}
