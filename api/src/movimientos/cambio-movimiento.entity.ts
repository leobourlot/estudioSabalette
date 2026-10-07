import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Movimiento } from './movimiento.entity.js';
import type { CambioCampo } from './reglas-movimientos.js';

export const MOVEMENT_ACTIONS = ['carga', 'modificacion', 'anulacion', 'restauracion'] as const;
export type AccionMovimiento = (typeof MOVEMENT_ACTIONS)[number];

/**
 * Un cambio de un movimiento (RF-20): la acción, quién y cuándo, y el valor anterior y nuevo
 * de cada dato que cambió. Un cambio de visibilidad es una modificación. Solo se insertan:
 * no hay ninguna operación que los modifique o borre (RF-21).
 */
@Entity('movimiento_cambios')
@Index('IDX_movimiento_cambios_movimiento', ['movimientoId', 'id'])
export class CambioMovimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  movimientoId: number;

  @ManyToOne(() => Movimiento, (movimiento) => movimiento.cambios)
  @JoinColumn({ name: 'movimientoId' })
  movimiento: Relation<Movimiento>;

  @Column({ type: 'enum', enum: MOVEMENT_ACTIONS })
  accion: AccionMovimiento;

  @Column({ type: 'int' })
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Relation<Usuario>;

  // El mismo instante que modificadoEn del movimiento (o creadoEn en la carga).
  @Column({ type: 'datetime', precision: 6 })
  fechaHora: Date;

  // Solo los datos que cambiaron; en la carga, todos con anterior en null.
  @Column({ type: 'json' })
  cambios: CambioCampo[];
}
