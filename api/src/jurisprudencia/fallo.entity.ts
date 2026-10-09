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
import { type Fuero, JURISDICTIONS } from '../causas/causa.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { FalloPalabraClave } from './fallo-palabra-clave.entity.js';
import {
  MAX_CARATULA_LENGTH,
  MAX_LINK_LENGTH,
  MAX_NUMERO_LENGTH,
  MAX_SUMARIO_LENGTH,
  MAX_TRIBUNAL_LENGTH,
} from './validadores/longitudes.js';

/**
 * Fallo del registro de jurisprudencia (spec 005, RF-1). Nunca se borra: se desactiva
 * (RF-29). Los textos se guardan ya convertidos (RF-3). El índice del listado resuelve el
 * filtro por activos y el orden: fecha, momento de carga e id (RF-21). El de repetido sirve
 * a la búsqueda por tribunal y número (RF-18).
 */
@Entity('fallos')
@Index('IDX_fallos_listado', ['activo', 'fecha', 'creadoEn', 'id'])
@Index('IDX_fallos_repetido', ['tribunal', 'numero'])
export class Fallo {
  // También es el orden de registro en el sistema, el último desempate de RF-21.
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: MAX_CARATULA_LENGTH })
  caratula: string;

  @Column({ type: 'varchar', length: MAX_TRIBUNAL_LENGTH })
  tribunal: string;

  // Los mismos valores que el fuero de una causa (spec 002, RF-1).
  @Column({ type: 'enum', enum: JURISDICTIONS })
  fuero: Fuero;

  // Día del fallo, sin hora. Llega como texto AAAA-MM-DD (dateStrings, plan 003).
  @Column({ type: 'date' })
  fecha: string;

  // NULL si no se informa.
  @Column({ type: 'varchar', length: MAX_NUMERO_LENGTH, nullable: true })
  numero: string | null;

  // El número sin separadores, para que la búsqueda encuentre "1234-2024" al escribir
  // "1234/2024" (RF-23). Lo calcula el service al guardar.
  @Column({ type: 'varchar', length: MAX_NUMERO_LENGTH, nullable: true })
  numeroBusqueda: string | null;

  @Column({ type: 'varchar', length: MAX_SUMARIO_LENGTH })
  sumario: string;

  @Column({ type: 'varchar', length: MAX_LINK_LENGTH, nullable: true })
  enlace: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'int' })
  creadoPorId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Relation<Usuario>;

  // Con microsegundos, para el desempate de RF-21. Lo asigna el service.
  @Column({ type: 'datetime', precision: 6 })
  creadoEn: Date;

  @Column({ type: 'int', nullable: true })
  modificadoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'modificadoPorId' })
  modificadoPor: Relation<Usuario> | null;

  // Cambio de datos o de palabras clave, desactivación o reactivación (RF-2).
  @Column({ type: 'datetime', precision: 6, nullable: true })
  modificadoEn: Date | null;

  @OneToMany(() => FalloPalabraClave, (relacion) => relacion.fallo)
  palabrasClave: Relation<FalloPalabraClave>[];
}
