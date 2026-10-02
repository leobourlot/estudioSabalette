import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Usuario } from './usuario.entity.js';

// Una sesión por ingreso. Solo se guardan hashes SHA-256 del secreto de renovación.
@Entity('sesiones')
export class Sesion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Relation<Usuario>;

  @Column({ type: 'char', length: 64 })
  tokenHash: string;

  // Hash del secreto reemplazado en la última renovación, para detectar reúso (RF-15).
  @Column({ type: 'char', length: 64, nullable: true })
  tokenAnteriorHash: string | null;

  @CreateDateColumn({ type: 'datetime' })
  creadaEn: Date;

  // Se corre a ahora + 7 días en cada renovación (RF-12).
  @Column({ type: 'datetime' })
  venceEn: Date;

  @Column({ type: 'datetime', nullable: true })
  revocadaEn: Date | null;

  // Errores de contraseña actual al cambiarla, dentro de esta sesión (RF-38).
  @Column({ type: 'int', default: 0 })
  intentosContrasenaFallidos: number;

  @Column({ type: 'datetime', nullable: true })
  primerIntentoFallidoEn: Date | null;
}
