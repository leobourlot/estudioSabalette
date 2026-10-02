import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Cliente } from './cliente.entity.js';

export const ROLES = ['admin', 'abogado', 'cliente'] as const;
export type Rol = (typeof ROLES)[number];

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ROLES })
  rol: Rol;

  // Exactamente un usuario tiene true; lo garantiza el service dentro de una transacción.
  @Column({ type: 'boolean', default: false })
  esPrincipal: boolean;

  // Null cuando un administrador libera el email de una cuenta desactivada (RF-24).
  // MySQL admite varios NULL en un índice único.
  @Index('UQ_usuarios_email', { unique: true })
  @Column({ type: 'varchar', length: 254, nullable: true })
  email: string | null;

  // En personas jurídicas: nombre y apellido de la persona de contacto.
  @Column({ type: 'varchar', length: 55 })
  nombre: string;

  @Column({ type: 'varchar', length: 55 })
  apellido: string;

  // select: false para que nunca viaje en una consulta salvo pedido explícito (RF-40).
  @Column({ type: 'varchar', length: 255, select: false })
  contrasenaHash: string;

  @Column({ type: 'boolean', default: true })
  debeCambiarContrasena: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'datetime', nullable: true })
  ultimoIngreso: Date | null;

  // Null solo para el administrador principal creado por consola.
  @Column({ type: 'int', nullable: true })
  creadoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Relation<Usuario> | null;

  @CreateDateColumn({ type: 'datetime' })
  creadoEn: Date;

  @Column({ type: 'int', nullable: true })
  modificadoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'modificadoPorId' })
  modificadoPor: Relation<Usuario> | null;

  @Column({ type: 'datetime', nullable: true })
  modificadoEn: Date | null;

  @OneToOne(() => Cliente, (cliente) => cliente.usuario)
  cliente: Relation<Cliente> | null;
}
