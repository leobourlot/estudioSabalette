import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Cliente, PERSON_TYPES, type TipoPersona } from '../usuarios/cliente.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Causa } from './causa.entity.js';

export const PROCEDURAL_ROLES = ['actor', 'demandado', 'tercero', 'otro'] as const;
export type RolProcesal = (typeof PROCEDURAL_ROLES)[number];

/**
 * Parte de una sola causa (RF-13). Si clienteId tiene valor, la parte es un cliente del
 * estudio y sus datos de identificación se leen de su cuenta, sin copiarlos (RF-14); los
 * datos propios quedan en NULL. Si no, la parte guarda sus propios datos (RF-15). La
 * coherencia entre ambos casos la garantizan los DTO y PartesService.
 */
@Entity('partes')
export class Parte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  causaId: number;

  @ManyToOne(() => Causa, (causa) => causa.partes)
  @JoinColumn({ name: 'causaId' })
  causa: Relation<Causa>;

  @Column({ type: 'enum', enum: PROCEDURAL_ROLES })
  rol: RolProcesal;

  @Column({ type: 'int', nullable: true })
  clienteId: number | null;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'clienteId', referencedColumnName: 'usuarioId' })
  cliente: Relation<Cliente> | null;

  @Column({ type: 'enum', enum: PERSON_TYPES, nullable: true })
  tipoPersona: TipoPersona | null;

  // Persona física no cliente.
  @Column({ type: 'varchar', length: 55, nullable: true })
  nombre: string | null;

  @Column({ type: 'varchar', length: 55, nullable: true })
  apellido: string | null;

  // Persona jurídica no cliente.
  @Column({ type: 'varchar', length: 55, nullable: true })
  razonSocial: string | null;

  // Opcionales y sin índice único: la misma persona puede ser parte de varias causas.
  @Column({ type: 'varchar', length: 8, nullable: true })
  dni: string | null;

  @Column({ type: 'char', length: 11, nullable: true })
  cuit: string | null;

  // false cuando se desvincula; nunca se borran partes (RF-22, RF-24).
  @Column({ type: 'boolean', default: true })
  vigente: boolean;

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
}
