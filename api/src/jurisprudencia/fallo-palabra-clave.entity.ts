import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Fallo } from './fallo.entity.js';
import { PalabraClave } from './palabra-clave.entity.js';

/**
 * Palabra clave de un fallo. La clave primaria compuesta impide repetir una palabra en el
 * mismo fallo (RF-14). Quitarla borra la fila: no se guarda historial. El índice por palabra
 * sirve al filtro del listado y a las sugerencias (RF-13, RF-25).
 */
@Entity('fallo_palabras_clave')
@Index('IDX_fallo_palabras_clave_palabra', ['palabraClaveId', 'falloId'])
export class FalloPalabraClave {
  @PrimaryColumn({ type: 'int' })
  falloId: number;

  @PrimaryColumn({ type: 'int' })
  palabraClaveId: number;

  @ManyToOne(() => Fallo, (fallo) => fallo.palabrasClave)
  @JoinColumn({ name: 'falloId' })
  fallo: Relation<Fallo>;

  @ManyToOne(() => PalabraClave)
  @JoinColumn({ name: 'palabraClaveId' })
  palabraClave: Relation<PalabraClave>;
}
