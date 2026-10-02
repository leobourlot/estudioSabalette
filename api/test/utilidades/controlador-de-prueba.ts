import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../src/autenticacion/decoradores.js';

/**
 * Rutas que solo existen en los tests e2e, para probar los guards globales sobre rutas
 * protegidas comunes mientras todavía no hay endpoints reales del panel ni del portal.
 */
@Controller('prueba')
export class TestOnlyController {
  @Get('protegida')
  protectedRoute() {
    return { ok: true };
  }

  @Roles('admin', 'abogado')
  @Get('panel')
  panelRoute() {
    return { ok: true };
  }
}
