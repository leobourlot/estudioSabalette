import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Usuario } from './usuario.entity.js';

export const PERSON_TYPES = ['fisica', 'juridica'] as const;
export type TipoPersona = (typeof PERSON_TYPES)[number];

// Datos propios de los clientes, 1 a 1 con su usuario. DNI, CUIT y tipo de persona son
// inmutables una vez creada la cuenta (RF-7); lo controla el service.
@Entity('clientes')
export class Cliente {
  @PrimaryColumn({ type: 'int' })
  usuarioId: number;

  @OneToOne(() => Usuario, (usuario) => usuario.cliente)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Relation<Usuario>;

  @Column({ type: 'enum', enum: PERSON_TYPES })
  tipoPersona: TipoPersona;

  // Solo personas físicas: 7 u 8 dígitos.
  @Index('UQ_clientes_dni', { unique: true })
  @Column({ type: 'varchar', length: 8, nullable: true })
  dni: string | null;

  // Solo personas jurídicas: 11 dígitos.
  @Index('UQ_clientes_cuit', { unique: true })
  @Column({ type: 'char', length: 11, nullable: true })
  cuit: string | null;

  @Column({ type: 'varchar', length: 55, nullable: true })
  razonSocial: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 55, nullable: true })
  domicilio: string | null;
}
