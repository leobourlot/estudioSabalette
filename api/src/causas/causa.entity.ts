import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Colaborador } from './colaborador.entity.js';
import { Parte } from './parte.entity.js';

export const JURISDICTIONS = ['civil', 'penal', 'familia', 'laboral', 'federal', 'otro'] as const;
export type Fuero = (typeof JURISDICTIONS)[number];

export const CASE_STATUSES = ['en_tramite', 'paralizada', 'archivada', 'finalizada'] as const;
export type EstadoCausa = (typeof CASE_STATUSES)[number];

/**
 * Clave para el control de expediente duplicado (RF-8 a RF-10). Es NULL en las causas
 * desactivadas, en los incidentes y en las que no tienen número o juzgado, así el índice
 * único solo compara causas activas no incidentes con número y juzgado (MySQL admite
 * varios NULL). La intercalación utf8mb4_unicode_ci no distingue mayúsculas ni tildes.
 */
const CASE_KEY_EXPRESSION =
  'CASE WHEN `activa` = 1 AND `esIncidente` = 0' +
  ' AND `numeroExpediente` IS NOT NULL AND `juzgado` IS NOT NULL' +
  " THEN CONCAT(`fuero`, '|', `juzgado`, '|', `numeroExpediente`) END";

@Entity('causas')
export class Causa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  caratula: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  numeroExpediente: string | null;

  // El número sin separadores, solo para la búsqueda (RF-37). Lo calcula el service.
  @Column({ type: 'varchar', length: 50, nullable: true })
  numeroExpedienteBusqueda: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  juzgado: string | null;

  @Column({ type: 'enum', enum: JURISDICTIONS })
  fuero: Fuero;

  @Column({ type: 'enum', enum: CASE_STATUSES, default: 'en_tramite' })
  estado: EstadoCausa;

  @Column({ type: 'boolean', default: false })
  esIncidente: boolean;

  // Número del expediente principal, como texto: obligatorio en un incidente, NULL si no (RF-10).
  @Column({ type: 'varchar', length: 50, nullable: true })
  expedientePrincipal: string | null;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  // 7 (fuero más largo) + 150 (juzgado) + 50 (número) + 2 separadores = 209.
  @Index('UQ_causas_expediente_activo', { unique: true })
  @Column({
    type: 'varchar',
    length: 210,
    nullable: true,
    asExpression: CASE_KEY_EXPRESSION,
    generatedType: 'STORED',
    insert: false,
    update: false,
  })
  claveExpediente: string | null;

  // Exactamente un responsable por causa, garantizado por el esquema (RF-29).
  @Column({ type: 'int' })
  responsableId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'responsableId' })
  responsable: Relation<Usuario>;

  @OneToMany(() => Colaborador, (colaborador) => colaborador.causa)
  colaboradores: Relation<Colaborador>[];

  @OneToMany(() => Parte, (parte) => parte.causa)
  partes: Relation<Parte>[];

  @Column({ type: 'int' })
  creadoPorId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Relation<Usuario>;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @Column({ type: 'int', nullable: true })
  modificadoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'modificadoPorId' })
  modificadoPor: Relation<Usuario> | null;

  @Column({ type: 'datetime', nullable: true })
  modificadoEn: Date | null;

  @Column({ type: 'int', nullable: true })
  desactivadaPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'desactivadaPorId' })
  desactivadaPor: Relation<Usuario> | null;

  @Column({ type: 'datetime', nullable: true })
  desactivadaEn: Date | null;

  @Column({ type: 'int', nullable: true })
  reactivadaPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'reactivadaPorId' })
  reactivadaPor: Relation<Usuario> | null;

  @Column({ type: 'datetime', nullable: true })
  reactivadaEn: Date | null;
}
