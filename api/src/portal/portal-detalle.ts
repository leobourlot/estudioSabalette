import type { Causa, EstadoCausa, Fuero } from '../causas/causa.entity.js';
import type { RolProcesal } from '../causas/parte.entity.js';
import type { MovimientoCliente } from '../movimientos/movimiento-detalle.js';
import { caseGroup, comparePortalParties, type GrupoCausa, portalParty } from './reglas-portal.js';

/**
 * Respuestas del portal del cliente (plan 004, "Tipos"). Se arman campo por campo, nunca a
 * partir de la entidad completa: el cliente recibe solo los datos que la spec 004 le permite
 * ver (RF-30). Nada de documentos, tipo de persona, ids de partes o integrantes, emails,
 * colaboradores, auditoría ni estado de las cuentas.
 */

/** Una causa de la lista (RF-9). */
export interface CausaPortalResumen {
  id: number;
  caratula: string;
  numeroExpediente: string | null;
  estado: EstadoCausa;
  grupo: GrupoCausa;
  /** AAAA-MM-DD, o null si no tiene (RF-8). */
  fechaUltimoMovimiento: string | null;
}

/** Una parte vigente como la ve el cliente (RF-14, RF-15). */
export interface PartePortal {
  nombre: string;
  rol: RolProcesal;
  esVos: boolean;
}

/** El responsable de la causa, solo si su cuenta está activa (RF-16). */
export interface ResponsablePortal {
  nombre: string;
  apellido: string;
}

/** Detalle de una causa (RF-13 a RF-17). */
export interface CausaPortalDetalle {
  id: number;
  caratula: string;
  numeroExpediente: string | null;
  juzgado: string | null;
  fuero: Fuero;
  estado: EstadoCausa;
  esIncidente: boolean;
  expedientePrincipal: string | null;
  partes: PartePortal[];
  responsable: ResponsablePortal | null;
}

/** Un movimiento abierto por el cliente, con la carátula de su causa (RF-22). */
export interface MovimientoClienteDetalle extends MovimientoCliente {
  causa: { id: number; caratula: string };
}

export function toCausaPortalResumen(
  causa: Pick<Causa, 'id' | 'caratula' | 'numeroExpediente' | 'estado'>,
  fechaUltimoMovimiento: string | null,
): CausaPortalResumen {
  return {
    id: causa.id,
    caratula: causa.caratula,
    numeroExpediente: causa.numeroExpediente,
    estado: causa.estado,
    grupo: caseGroup(causa.estado),
    fechaUltimoMovimiento,
  };
}

/**
 * Espera la causa con el responsable y las partes (con cliente.usuario si son clientes)
 * cargados. Solo las partes vigentes, ordenadas por rol y nombre (RF-14, RF-15).
 */
export function toCausaPortalDetalle(causa: Causa, clienteId: number): CausaPortalDetalle {
  const partes = causa.partes
    .filter((parte) => parte.vigente)
    .map((parte) => portalParty(parte, clienteId))
    .sort(comparePortalParties)
    .map(({ nombre, rol, esVos }) => ({ nombre, rol, esVos }));
  return {
    id: causa.id,
    caratula: causa.caratula,
    numeroExpediente: causa.numeroExpediente,
    juzgado: causa.juzgado,
    fuero: causa.fuero,
    estado: causa.estado,
    esIncidente: causa.esIncidente,
    expedientePrincipal: causa.expedientePrincipal,
    partes,
    responsable: causa.responsable.activo
      ? { nombre: causa.responsable.nombre, apellido: causa.responsable.apellido }
      : null,
  };
}

export function toMovimientoClienteDetalle(
  movimiento: MovimientoCliente,
  causa: Pick<Causa, 'id' | 'caratula'>,
): MovimientoClienteDetalle {
  return { ...movimiento, causa: { id: causa.id, caratula: causa.caratula } };
}
