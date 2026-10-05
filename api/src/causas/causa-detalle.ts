import type { TipoPersona } from '../usuarios/cliente.entity.js';
import type { AuditAuthor } from '../usuarios/usuario-detalle.js';
import type { Rol, Usuario } from '../usuarios/usuario.entity.js';
import type { Causa, EstadoCausa, Fuero } from './causa.entity.js';
import type { Parte, RolProcesal } from './parte.entity.js';
import { partyIdentity } from './reglas-causas.js';

/**
 * Respuestas de /api/panel/causas (plan 002, "Tipos"). Se arman campo por campo, nunca a
 * partir de la entidad completa: así no salen emails, hashes ni datos de contacto de las
 * cuentas unidas, ni las columnas internas de búsqueda y de duplicados.
 */

export interface IntegranteResumen {
  id: number;
  nombre: string;
  apellido: string;
  rol: Rol;
  activo: boolean;
}

export interface ParteDetalle {
  id: number;
  rol: RolProcesal;
  esCliente: boolean;
  clienteId: number | null;
  /** Si la cuenta del cliente está activa; null en una parte no cliente. */
  clienteActivo: boolean | null;
  tipoPersona: TipoPersona;
  nombre: string | null;
  apellido: string | null;
  razonSocial: string | null;
  dni: string | null;
  cuit: string | null;
}

export interface CausaResumen {
  id: number;
  caratula: string;
  numeroExpediente: string | null;
  juzgado: string | null;
  fuero: Fuero;
  estado: EstadoCausa;
  esIncidente: boolean;
  expedientePrincipal: string | null;
  activa: boolean;
  responsable: IntegranteResumen;
  creadoEn: Date;
  modificadoEn: Date | null;
}

export interface CausaDetalle extends CausaResumen {
  colaboradores: IntegranteResumen[];
  partes: ParteDetalle[];
  partesDesvinculadas: ParteDetalle[];
  creadoPor: AuditAuthor | null;
  modificadoPor: AuditAuthor | null;
  desactivadaPor: AuditAuthor | null;
  desactivadaEn: Date | null;
  reactivadaPor: AuditAuthor | null;
  reactivadaEn: Date | null;
}

/** Causa mencionada en un aviso, como las de RF-20. */
export interface CausaReferencia {
  id: number;
  caratula: string;
  numeroExpediente: string | null;
}

const toAuthor = (usuario: Usuario | null | undefined): AuditAuthor | null =>
  usuario ? { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido } : null;

const byName = (a: IntegranteResumen, b: IntegranteResumen) =>
  a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es');

export function toIntegranteResumen(usuario: Usuario): IntegranteResumen {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    rol: usuario.rol,
    activo: usuario.activo,
  };
}

/** Espera la parte con cliente.usuario cargado si es una parte cliente (RF-14). */
export function toParteDetalle(parte: Parte): ParteDetalle {
  const identity = partyIdentity(parte);
  return {
    id: parte.id,
    rol: parte.rol,
    esCliente: identity.clienteId !== null,
    clienteId: identity.clienteId,
    clienteActivo: parte.cliente ? parte.cliente.usuario.activo : null,
    tipoPersona: identity.tipoPersona,
    nombre: identity.nombre,
    apellido: identity.apellido,
    razonSocial: identity.razonSocial,
    dni: identity.dni,
    cuit: identity.cuit,
  };
}

/** Espera la causa con el responsable cargado. */
export function toCausaResumen(causa: Causa): CausaResumen {
  return {
    id: causa.id,
    caratula: causa.caratula,
    numeroExpediente: causa.numeroExpediente,
    juzgado: causa.juzgado,
    fuero: causa.fuero,
    estado: causa.estado,
    esIncidente: causa.esIncidente,
    expedientePrincipal: causa.expedientePrincipal,
    activa: causa.activa,
    responsable: toIntegranteResumen(causa.responsable),
    creadoEn: causa.creadoEn,
    modificadoEn: causa.modificadoEn,
  };
}

/**
 * Espera la causa con responsable, colaboradores.usuario, partes (con cliente.usuario) y
 * los autores de la auditoría cargados. Las partes van por orden de alta (RF-12).
 */
export function toCausaDetalle(causa: Causa): CausaDetalle {
  const partes = [...causa.partes].sort((a, b) => a.id - b.id);
  return {
    ...toCausaResumen(causa),
    colaboradores: causa.colaboradores
      .map((colaborador) => toIntegranteResumen(colaborador.usuario))
      .sort(byName),
    partes: partes.filter((parte) => parte.vigente).map(toParteDetalle),
    partesDesvinculadas: partes.filter((parte) => !parte.vigente).map(toParteDetalle),
    creadoPor: toAuthor(causa.creadoPor),
    modificadoPor: toAuthor(causa.modificadoPor),
    desactivadaPor: toAuthor(causa.desactivadaPor),
    desactivadaEn: causa.desactivadaEn,
    reactivadaPor: toAuthor(causa.reactivadaPor),
    reactivadaEn: causa.reactivadaEn,
  };
}

export function toCausaReferencia(causa: Pick<Causa, 'id' | 'caratula' | 'numeroExpediente'>) {
  return {
    id: causa.id,
    caratula: causa.caratula,
    numeroExpediente: causa.numeroExpediente,
  } satisfies CausaReferencia;
}

/** Parte o colaborador que no se guardó en el alta, con sus motivos (RF-7). */
export interface Rechazo {
  indiceParte?: number;
  colaboradorId?: number;
  mensajes: string[];
}

/** Respuesta del alta: la causa creada, lo que no se guardó y el aviso de RF-20. */
export interface ResultadoAlta {
  causa: CausaDetalle;
  rechazos: Rechazo[];
  causasComoNoCliente: CausaReferencia[];
}

/** Respuesta al agregar, modificar o volver a vincular una parte: la causa y el aviso de RF-20. */
export interface ResultadoParte {
  causa: CausaDetalle;
  causasComoNoCliente: CausaReferencia[];
}
