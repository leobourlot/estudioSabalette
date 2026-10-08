import { Transform } from 'class-transformer';
import { toInteger } from '../../causas/dto/reglas-causa.js';
import { LIST_MESSAGES } from '../../movimientos/dto/listar-movimientos.dto.js';
import { optional, Rule } from '../../usuarios/dto/reglas.js';

/** Página de una lista del portal: entero desde 1, por defecto 1 (spec 004, RF-24). */
export class PortalPageQueryDto {
  @Transform(toInteger)
  @Rule(
    optional((value) =>
      Number.isInteger(value) && (value as number) >= 1 ? null : LIST_MESSAGES.pagina,
    ),
  )
  pagina?: number;
}
