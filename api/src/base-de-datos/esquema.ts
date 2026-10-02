import { CrearUsuariosClientesYSesiones1790969709009 } from '../migraciones/1790969709009-crear-usuarios-clientes-y-sesiones.js';
import { Cliente } from '../usuarios/cliente.entity.js';
import { Sesion } from '../usuarios/sesion.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';

// Lista única de entidades y migraciones para el CLI de TypeORM y los tests e2e.
// Cada migración nueva (migration:create o migration:generate) se agrega al final de MIGRATIONS.
export const ENTITIES = [Usuario, Cliente, Sesion];

export const MIGRATIONS = [CrearUsuariosClientesYSesiones1790969709009];
