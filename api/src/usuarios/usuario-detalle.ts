import type { Usuario } from './usuario.entity.js';
import { toUsuarioPropio, type UsuarioPropio } from './usuario-propio.js';

export interface AuditAuthor {
  id: number;
  nombre: string;
  apellido: string;
}

/** Respuesta de la gestión de cuentas (plan 001, `UsuarioDetalle`): datos y auditoría (RF-4, RF-34). */
export interface UsuarioDetalle extends UsuarioPropio {
  activo: boolean;
  ultimoIngreso: Date | null;
  creadoEn: Date;
  modificadoEn: Date | null;
  creadoPor: AuditAuthor | null;
  modificadoPor: AuditAuthor | null;
}

const toAuthor = (usuario: Usuario | null | undefined): AuditAuthor | null =>
  usuario ? { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido } : null;

/** Espera el usuario con las relaciones cliente, creadoPor y modificadoPor cargadas. */
export function toUsuarioDetalle(usuario: Usuario): UsuarioDetalle {
  return {
    ...toUsuarioPropio(usuario),
    activo: usuario.activo,
    ultimoIngreso: usuario.ultimoIngreso,
    creadoEn: usuario.creadoEn,
    modificadoEn: usuario.modificadoEn,
    creadoPor: toAuthor(usuario.creadoPor),
    modificadoPor: toAuthor(usuario.modificadoPor),
  };
}
