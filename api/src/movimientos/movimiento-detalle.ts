import type { Usuario } from '../usuarios/usuario.entity.js';
import type { AccionMovimiento } from './cambio-movimiento.entity.js';
import type { Movimiento, TipoMovimiento } from './movimiento.entity.js';
import {
  type CambioCampo,
  isFutureDate,
  type OrigenTextoVisible,
  visibleText,
} from './reglas-movimientos.js';

/**
 * Respuestas de movimientos (plan 003, "Tipos"). Se arman campo por campo, nunca a partir de
 * la entidad completa: así no salen emails ni hashes de las cuentas unidas.
 */

/** Autor de un movimiento o de un cambio; `activo` permite mostrarlo como desactivado (RF-36). */
export interface AutorResumen {
  id: number;
  nombre: string;
  apellido: string;
  activo: boolean;
}

/** Fila del historial de movimientos de una causa (RF-24). */
export interface MovimientoResumen {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  descripcion: string;
  visible: boolean;
  tieneTextoCliente: boolean;
  anulado: boolean;
  esFechaFutura: boolean;
  creadoPor: AutorResumen;
  creadoEn: Date;
}

/** Un cambio del historial de cambios de un movimiento (RF-20, RF-22). */
export interface CambioMovimientoDetalle {
  id: number;
  accion: AccionMovimiento;
  usuario: AutorResumen;
  fechaHora: Date;
  cambios: CambioCampo[];
}

/** Consulta de un movimiento (RF-22). */
export interface MovimientoDetalle extends MovimientoResumen {
  causaId: number;
  /** Permite a la interfaz ocultar las acciones en una causa desactivada (RF-28). */
  causaActiva: boolean;
  textoCliente: string | null;
  textoVisible: string;
  origenTextoVisible: OrigenTextoVisible;
  modificadoPor: AutorResumen | null;
  modificadoEn: Date | null;
  cambios: CambioMovimientoDetalle[];
}

/**
 * Lo único que se pone a disposición de un cliente de cada movimiento que puede ver
 * (RF-31). Nunca la descripción cuando hay texto para el cliente, ni autores, fechas de
 * registro o cambios. Lo usa la spec 004.
 */
export interface MovimientoCliente {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  texto: string;
  anulado: boolean;
  /** Fecha posterior al día actual en Buenos Aires; nunca en un anulado (spec 004, RF-21). */
  esFechaFutura: boolean;
}

export function toAutorResumen(usuario: Usuario): AutorResumen {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    activo: usuario.activo,
  };
}

/** Espera el movimiento con creadoPor cargado. */
export function toMovimientoResumen(
  movimiento: Movimiento,
  ahora: Date = new Date(),
): MovimientoResumen {
  return {
    id: movimiento.id,
    fecha: movimiento.fecha,
    tipo: movimiento.tipo,
    descripcion: movimiento.descripcion,
    visible: movimiento.visible,
    tieneTextoCliente: movimiento.textoCliente !== null,
    anulado: movimiento.anulado,
    esFechaFutura: isFutureDate(movimiento.fecha, ahora),
    creadoPor: toAutorResumen(movimiento.creadoPor),
    creadoEn: movimiento.creadoEn,
  };
}

/**
 * Espera el movimiento con creadoPor, modificadoPor y cambios.usuario cargados. Los cambios
 * van del más reciente al más antiguo (RF-22).
 */
export function toMovimientoDetalle(
  movimiento: Movimiento,
  causaActiva: boolean,
  ahora: Date = new Date(),
): MovimientoDetalle {
  const { texto, origen } = visibleText(movimiento);
  return {
    ...toMovimientoResumen(movimiento, ahora),
    causaId: movimiento.causaId,
    causaActiva,
    textoCliente: movimiento.textoCliente,
    textoVisible: texto,
    origenTextoVisible: origen,
    modificadoPor: movimiento.modificadoPor ? toAutorResumen(movimiento.modificadoPor) : null,
    modificadoEn: movimiento.modificadoEn,
    cambios: [...movimiento.cambios]
      .sort((a, b) => b.id - a.id)
      .map((cambio) => ({
        id: cambio.id,
        accion: cambio.accion,
        usuario: toAutorResumen(cambio.usuario),
        fechaHora: cambio.fechaHora,
        cambios: cambio.cambios,
      })),
  };
}

export function toMovimientoCliente(
  movimiento: Movimiento,
  ahora: Date = new Date(),
): MovimientoCliente {
  return {
    id: movimiento.id,
    fecha: movimiento.fecha,
    tipo: movimiento.tipo,
    texto: visibleText(movimiento).texto,
    anulado: movimiento.anulado,
    esFechaFutura: !movimiento.anulado && isFutureDate(movimiento.fecha, ahora),
  };
}
