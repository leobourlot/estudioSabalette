import type { EstadoCausa } from '../causas/causa.entity.js';
import { PROCEDURAL_ROLES, type RolProcesal } from '../causas/parte.entity.js';
import { partyIdentity, type PartySource } from '../causas/reglas-causas.js';

/**
 * Reglas del portal del cliente que no necesitan la base (plan 004, "Reglas de negocio"). Los
 * services las consultan, igual que reglas-causas y reglas-movimientos.
 */

// Sin distinguir mayúsculas, minúsculas ni tildes, y con la ñ después de la n, como en español.
const collator = new Intl.Collator('es', { sensitivity: 'base' });

// --- Lista de causas (RF-10, RF-11) ---

export type GrupoCausa = 'en_curso' | 'archivadas_y_finalizadas';

/** "En curso": En trámite y Paralizada. "Archivadas y finalizadas": el resto (RF-10). */
export function caseGroup(estado: EstadoCausa): GrupoCausa {
  return estado === 'en_tramite' || estado === 'paralizada'
    ? 'en_curso'
    : 'archivadas_y_finalizadas';
}

/** Lo que hace falta de una causa para ordenarla en la lista. */
export interface PortalCaseRow {
  id: number;
  caratula: string;
  grupo: GrupoCausa;
  /** AAAA-MM-DD, o null si no tiene (RF-8). */
  fechaUltimoMovimiento: string | null;
}

/**
 * Orden de RF-11: el grupo "en curso" primero; dentro de cada grupo, por fecha del último
 * movimiento (las que no tienen, al final); después por carátula; y a igual carátula, la última
 * registrada primero. Termina en el id, que es único: con los mismos datos, el orden es siempre
 * el mismo.
 */
export function comparePortalCausas(a: PortalCaseRow, b: PortalCaseRow): number {
  if (a.grupo !== b.grupo) return a.grupo === 'en_curso' ? -1 : 1;
  if (a.fechaUltimoMovimiento !== b.fechaUltimoMovimiento) {
    if (a.fechaUltimoMovimiento === null) return 1;
    if (b.fechaUltimoMovimiento === null) return -1;
    return a.fechaUltimoMovimiento > b.fechaUltimoMovimiento ? -1 : 1;
  }
  return collator.compare(a.caratula, b.caratula) || b.id - a.id;
}

// --- Partes (RF-14, RF-15) ---

/**
 * Una parte como la ve el cliente, con sus claves de orden. El nombre va en un solo texto para
 * no revelar el tipo de persona (RF-15); no lleva documento, id ni si es cliente.
 */
export interface PortalPartyRow {
  nombre: string;
  rol: RolProcesal;
  esVos: boolean;
  claveApellido: string;
  claveNombre: string;
}

/**
 * Arma la parte con los datos actuales de la cuenta si es cliente (spec 002, RF-14): "Nombre
 * Apellido" o la razón social. `esVos` marca la parte del cliente que consulta.
 */
export function portalParty(
  parte: PartySource & { rol: RolProcesal },
  clienteId: number,
): PortalPartyRow {
  const identity = partyIdentity(parte);
  const esVos = identity.clienteId === clienteId;
  if (identity.tipoPersona === 'juridica') {
    const razonSocial = identity.razonSocial ?? '';
    return {
      nombre: razonSocial,
      rol: parte.rol,
      esVos,
      claveApellido: razonSocial,
      claveNombre: '',
    };
  }
  const nombre = identity.nombre ?? '';
  const apellido = identity.apellido ?? '';
  return {
    nombre: `${nombre} ${apellido}`.trim(),
    rol: parte.rol,
    esVos,
    claveApellido: apellido,
    claveNombre: nombre,
  };
}

/** Por rol procesal (Actor, Demandado, Tercero, Otro) y después por apellido o razón social y nombre. */
export function comparePortalParties(a: PortalPartyRow, b: PortalPartyRow): number {
  return (
    PROCEDURAL_ROLES.indexOf(a.rol) - PROCEDURAL_ROLES.indexOf(b.rol) ||
    collator.compare(a.claveApellido, b.claveApellido) ||
    collator.compare(a.claveNombre, b.claveNombre)
  );
}

// --- Páginas (RF-24, RF-25) ---

/** Una página de una lista ya ordenada, sin totales: solo si hay una siguiente (RF-24). */
export interface PortalPage<T> {
  items: T[];
  pagina: number;
  haySiguiente: boolean;
}

/** Una página posterior a la última viene vacía y sin siguiente (RF-25). */
export function pageOf<T>(items: T[], pagina: number, porPagina: number): PortalPage<T> {
  const start = (pagina - 1) * porPagina;
  return {
    items: items.slice(start, start + porPagina),
    pagina,
    haySiguiente: items.length > start + porPagina,
  };
}
