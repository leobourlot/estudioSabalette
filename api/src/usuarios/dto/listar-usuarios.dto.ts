import { Transform } from 'class-transformer';
import type { Rol } from '../usuario.entity.js';
import { fitsMaxLength } from '../validadores/longitudes.js';
import { optional, rolRule, Rule, trimText } from './reglas.js';

const MAX_SEARCH_LENGTH = 100;

/** Parámetros del listado de cuentas (RF-26). Llegan como texto en la URL. */
export class ListUsersQueryDto {
  @Transform(({ value }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  )
  @Rule(
    optional((value) =>
      Number.isInteger(value) && (value as number) >= 1
        ? null
        : 'La página debe ser un número entero mayor o igual a 1',
    ),
  )
  pagina?: number;

  @Transform(trimText)
  @Rule(
    optional((value) =>
      typeof value === 'string' && fitsMaxLength(value, MAX_SEARCH_LENGTH)
        ? null
        : `La búsqueda no puede tener más de ${MAX_SEARCH_LENGTH} caracteres`,
    ),
  )
  buscar?: string;

  @Rule(optional(rolRule))
  rol?: Rol;

  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @Rule(
    optional((value) =>
      typeof value === 'boolean' ? null : 'El filtro activo debe ser true o false',
    ),
  )
  activo?: boolean;
}
