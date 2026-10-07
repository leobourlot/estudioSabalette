import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Causa } from '../causas/causa.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { CambioMovimiento } from './cambio-movimiento.entity.js';
import { MAX_MOVEMENT_TEXT_LENGTH } from './validadores/longitudes.js';

export const MOVEMENT_TYPES = [
  'escrito_presentado',
  'providencia',
  'resolucion',
  'sentencia',
  'notificacion',
  'audiencia',
  'pericia',
  'oficio',
  'otro',
] as const;
export type TipoMovimiento = (typeof MOVEMENT_TYPES)[number];

/**
 * Movimiento de una sola causa, que no cambia de causa (RF-1, RF-12). Nunca se borra: se
 * anula (RF-16). Cada cambio queda además en movimiento_cambios (RF-20). El índice sirve al
 * filtro por causa y al orden del historial: fecha, momento de carga e id (RF-23).
 */
@Entity('movimientos')
@Index('IDX_movimientos_historial', ['causaId', 'fecha', 'creadoEn', 'id'])
export class Movimiento {
  // También es el orden de registro en el sistema, el último desempate de RF-23.
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  causaId: number;

  @ManyToOne(() => Causa)
  @JoinColumn({ name: 'causaId' })
  causa: Relation<Causa>;

  // Día del hecho, sin hora. Llega como texto AAAA-MM-DD (dateStrings, plan 003).
  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'enum', enum: MOVEMENT_TYPES })
  tipo: TipoMovimiento;

  @Column({ type: 'varchar', length: MAX_MOVEMENT_TEXT_LENGTH })
  descripcion: string;

  // NULL si no se informa: el cliente ve la descripción (RF-7).
  @Column({ type: 'varchar', length: MAX_MOVEMENT_TEXT_LENGTH, nullable: true })
  textoCliente: string | null;

  @Column({ type: 'boolean', default: false })
  visible: boolean;

  @Column({ type: 'boolean', default: false })
  anulado: boolean;

  @Column({ type: 'int' })
  creadoPorId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Relation<Usuario>;

  // Lo asigna el service, el mismo instante que el cambio de carga.
  @Column({ type: 'datetime', precision: 6 })
  creadoEn: Date;

  @Column({ type: 'int', nullable: true })
  modificadoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'modificadoPorId' })
  modificadoPor: Relation<Usuario> | null;

  // Cualquier cambio de datos o de visibilidad, anulación o restauración (RF-2).
  @Column({ type: 'datetime', precision: 6, nullable: true })
  modificadoEn: Date | null;

  @OneToMany(() => CambioMovimiento, (cambio) => cambio.movimiento)
  cambios: Relation<CambioMovimiento>[];
}
