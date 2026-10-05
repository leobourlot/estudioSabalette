import { Transform } from 'class-transformer';
import { optional, Rule, trimText } from '../../usuarios/dto/reglas.js';
import { fitsMaxLength } from '../../usuarios/validadores/longitudes.js';
import type { EstadoCausa, Fuero } from '../causa.entity.js';
import {
  booleanRule,
  CAUSA_MESSAGES,
  estadoRule,
  fueroRule,
  idRule,
  toBoolean,
  toInteger,
} from './reglas-causa.js';

const MAX_SEARCH_LENGTH = 100;

const filterRule = (name: string) =>
  optional(booleanRule(`El filtro ${name} debe ser true o false`));

/** Parámetros del listado de causas (RF-36 a RF-39). Llegan como texto en la URL. */
export class ListCausasQueryDto {
  @Transform(toInteger)
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

  @Rule(optional(fueroRule))
  fuero?: Fuero;

  @Rule(optional(estadoRule))
  estado?: EstadoCausa;

  @Transform(toInteger)
  @Rule(optional(idRule(CAUSA_MESSAGES.responsableId)))
  responsableId?: number;

  /** Causas donde quien consulta es responsable o colaborador. */
  @Transform(toBoolean)
  @Rule(filterRule('mias'))
  mias?: boolean;

  @Transform(toBoolean)
  @Rule(filterRule('responsableDesactivado'))
  responsableDesactivado?: boolean;

  @Transform(toBoolean)
  @Rule(filterRule('incluirDesactivadas'))
  incluirDesactivadas?: boolean;
}
