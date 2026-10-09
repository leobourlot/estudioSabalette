import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { MAX_KEYWORD_LENGTH } from './validadores/longitudes.js';

/**
 * Palabra del catálogo compartido de palabras clave (RF-10). Nunca se borra ni se renombra
 * por otra distinta (RF-15): solo cambia su forma (RF-12).
 */
@Entity('palabras_clave')
@Index('UQ_palabras_clave_clave', ['clave'], { unique: true })
export class PalabraClave {
  @PrimaryGeneratedColumn()
  id: number;

  // La forma que se muestra, ya convertida (RF-3). Cambia si alguien la escribe distinto (RF-12).
  @Column({ type: 'varchar', length: MAX_KEYWORD_LENGTH })
  texto: string;

  // flexibleKey(texto): una sola palabra por forma de comparación flexible (RF-9, RF-11). Con
  // intercalación binaria, la igualdad es exactamente la de flexibleKey y no la de la base.
  @Column({ type: 'varchar', length: MAX_KEYWORD_LENGTH, collation: 'utf8mb4_bin' })
  clave: string;

  @Column({ type: 'datetime', precision: 6 })
  creadoEn: Date;
}
