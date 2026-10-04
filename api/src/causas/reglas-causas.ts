import type { TipoPersona } from '../usuarios/cliente.entity.js';
import type { Causa } from './causa.entity.js';
import type { Parte } from './parte.entity.js';

/**
 * Reglas de causas y partes como funciones puras, sin acceso a la base (plan 002, "Reglas
 * de negocio"). Los services las consultan, igual que permisos-gestion en la spec 001.
 */

// --- Expediente (RF-8 a RF-10) ---

export type CaseKeyData = Pick<
  Causa,
  'activa' | 'esIncidente' | 'fuero' | 'juzgado' | 'numeroExpediente'
>;

/**
 * La misma clave que calcula la columna generada claveExpediente: null en causas
 * desactivadas, incidentes y causas sin número o sin juzgado. El número se usa tal como se
 * escribió: quitar separadores puede igualar números distintos. Al buscarla en la base, la
 * intercalación hace que no se distingan mayúsculas ni tildes.
 */
export function caseKey(causa: CaseKeyData): string | null {
  if (!causa.activa || causa.esIncidente) return null;
  if (causa.numeroExpediente === null || causa.juzgado === null) return null;
  return `${causa.fuero}|${causa.juzgado}|${causa.numeroExpediente}`;
}

// --- Identidad de las partes (RF-14 a RF-19) ---

/**
 * Datos de identificación de una parte, ya resueltos: los propios si no es cliente, o los
 * de su cuenta si lo es (RF-14). De una persona jurídica cliente se toma la razón social,
 * no el nombre del contacto.
 */
export interface PartyIdentity {
  clienteId: number | null;
  tipoPersona: TipoPersona;
  nombre: string | null;
  apellido: string | null;
  razonSocial: string | null;
  dni: string | null;
  cuit: string | null;
}

/** Una parte con su cliente y el usuario del cliente cargados, si es cliente. */
export type PartySource = Pick<
  Parte,
  'clienteId' | 'tipoPersona' | 'nombre' | 'apellido' | 'razonSocial' | 'dni' | 'cuit'
> & {
  cliente: {
    tipoPersona: TipoPersona;
    razonSocial: string | null;
    dni: string | null;
    cuit: string | null;
    usuario: { nombre: string; apellido: string };
  } | null;
};

export function partyIdentity(parte: PartySource): PartyIdentity {
  if (parte.clienteId !== null) {
    const { cliente } = parte;
    if (!cliente) throw new Error(`La parte cliente ${parte.clienteId} no tiene la cuenta cargada`);
    const isLegalPerson = cliente.tipoPersona === 'juridica';
    return {
      clienteId: parte.clienteId,
      tipoPersona: cliente.tipoPersona,
      nombre: isLegalPerson ? null : cliente.usuario.nombre,
      apellido: isLegalPerson ? null : cliente.usuario.apellido,
      razonSocial: isLegalPerson ? cliente.razonSocial : null,
      dni: cliente.dni,
      cuit: cliente.cuit,
    };
  }
  if (parte.tipoPersona === null) throw new Error('La parte no cliente no tiene tipo de persona');
  return {
    clienteId: null,
    tipoPersona: parte.tipoPersona,
    nombre: parte.nombre,
    apellido: parte.apellido,
    razonSocial: parte.razonSocial,
    dni: parte.dni,
    cuit: parte.cuit,
  };
}

/** DNI o CUIT de la parte, ya normalizado, o null si no tiene. */
export function documentOf(identity: PartyIdentity): string | null {
  return identity.dni ?? identity.cuit;
}

export function hasSameDocument(a: PartyIdentity, b: PartyIdentity): boolean {
  const document = documentOf(a);
  return document !== null && document === documentOf(b);
}

/**
 * RF-18: la misma persona es el mismo cliente o el mismo DNI o CUIT. Un nombre igual no
 * alcanza: eso solo motiva la pregunta de RF-19.
 */
export function isSamePerson(a: PartyIdentity, b: PartyIdentity): boolean {
  if (a.clienteId !== null && a.clienteId === b.clienteId) return true;
  return hasSameDocument(a, b);
}

/**
 * Nombre en minúsculas, sin tildes ni diéresis (también ñ → n) y sin espacios en los
 * extremos: compara igual que la intercalación utf8mb4_unicode_ci de la base, que se usa
 * para buscar homónimos entre los clientes del estudio.
 */
export function normalizeNameForComparison(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const sameText = (a: string | null, b: string | null) =>
  a !== null && b !== null && normalizeNameForComparison(a) === normalizeNameForComparison(b);

/** RF-19: mismo nombre y apellido (personas físicas) o misma razón social (jurídicas). */
export function hasSameName(a: PartyIdentity, b: PartyIdentity): boolean {
  if (a.tipoPersona !== b.tipoPersona) return false;
  if (a.tipoPersona === 'juridica') return sameText(a.razonSocial, b.razonSocial);
  return sameText(a.nombre, b.nombre) && sameText(a.apellido, b.apellido);
}
