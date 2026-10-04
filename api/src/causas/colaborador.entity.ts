import { Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity.js';
import { Causa } from './causa.entity.js';

/**
 * Colaborador de una causa (RF-29). La clave primaria compuesta impide repetir un
 * integrante en la misma causa (RF-31). Quitarlo borra la fila: no se guarda historial
 * de quién intervino (RF-34).
 */
@Entity('causa_colaboradores')
export class Colaborador {
  @PrimaryColumn({ type: 'int' })
  causaId: number;

  @PrimaryColumn({ type: 'int' })
  usuarioId: number;

  @ManyToOne(() => Causa, (causa) => causa.colaboradores)
  @JoinColumn({ name: 'causaId' })
  causa: Relation<Causa>;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Relation<Usuario>;
}
