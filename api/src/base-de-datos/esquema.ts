import { Causa } from '../causas/causa.entity.js';
import { Colaborador } from '../causas/colaborador.entity.js';
import { Parte } from '../causas/parte.entity.js';
import { CrearUsuariosClientesYSesiones1790969709009 } from '../migraciones/1790969709009-crear-usuarios-clientes-y-sesiones.js';
import { CrearCausasPartesYColaboradores1791156117399 } from '../migraciones/1791156117399-crear-causas-partes-y-colaboradores.js';
import { CrearMovimientosYCambios1791333903330 } from '../migraciones/1791333903330-crear-movimientos-y-cambios.js';
import { CambioMovimiento } from '../movimientos/cambio-movimiento.entity.js';
import { Movimiento } from '../movimientos/movimiento.entity.js';
import { Cliente } from '../usuarios/cliente.entity.js';
import { Sesion } from '../usuarios/sesion.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';

// Lista única de entidades y migraciones para el CLI de TypeORM y los tests e2e.
// Cada migración nueva (migration:create o migration:generate) se agrega al final de MIGRATIONS.
export const ENTITIES = [
  Usuario,
  Cliente,
  Sesion,
  Causa,
  Parte,
  Colaborador,
  Movimiento,
  CambioMovimiento,
];

export const MIGRATIONS = [
  CrearUsuariosClientesYSesiones1790969709009,
  CrearCausasPartesYColaboradores1791156117399,
  CrearMovimientosYCambios1791333903330,
];
