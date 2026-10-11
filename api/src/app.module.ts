import { Module } from '@nestjs/common';
import { AuthenticationModule } from './autenticacion/autenticacion.module.js';
import { DatabaseModule } from './base-de-datos/base-de-datos.module.js';
import { CausasModule } from './causas/causas.module.js';
import { ConfigurationModule } from './configuracion/configuracion.module.js';
import { JurisprudenciaModule } from './jurisprudencia/jurisprudencia.module.js';
import { ModelosEscritosModule } from './modelos-escritos/modelos-escritos.module.js';
import { MovimientosModule } from './movimientos/movimientos.module.js';
import { PortalModule } from './portal/portal.module.js';
import { UsersModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    ConfigurationModule,
    DatabaseModule,
    AuthenticationModule,
    UsersModule,
    CausasModule,
    MovimientosModule,
    PortalModule,
    JurisprudenciaModule,
    ModelosEscritosModule,
  ],
})
export class AppModule {}
