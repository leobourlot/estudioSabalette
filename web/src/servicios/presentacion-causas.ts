import type {
  CausaResumen,
  EstadoCausa,
  Fuero,
  IntegranteResumen,
  ParteDetalle,
  RolProcesal,
} from './causas';
import { formatCuit, formatDni } from './presentacion';

/** Cómo se muestran los datos de las causas. Funciones puras, sin React (principio 3). */

/** Listas cerradas de la spec 002 (RF-1, RF-13), en su orden, como [valor, etiqueta]. */
export const JURISDICTION_OPTIONS: readonly [Fuero, string][] = [
  ['civil', 'Civil'],
  ['penal', 'Penal'],
  ['familia', 'Familia'],
  ['laboral', 'Laboral'],
  ['federal', 'Federal'],
  ['otro', 'Otro'],
];

export const CASE_STATUS_OPTIONS: readonly [EstadoCausa, string][] = [
  ['en_tramite', 'En trámite'],
  ['paralizada', 'Paralizada'],
  ['archivada', 'Archivada'],
  ['finalizada', 'Finalizada'],
];

export const PROCEDURAL_ROLE_OPTIONS: readonly [RolProcesal, string][] = [
  ['actor', 'Actor'],
  ['demandado', 'Demandado'],
  ['tercero', 'Tercero'],
  ['otro', 'Otro'],
];

const labelFrom =
  <T extends string>(options: readonly [T, string][]) =>
  (value: T): string =>
    options.find(([option]) => option === value)?.[1] ?? value;

export const fueroLabel = labelFrom(JURISDICTION_OPTIONS);
export const estadoLabel = labelFrom(CASE_STATUS_OPTIONS);
export const rolProcesalLabel = labelFrom(PROCEDURAL_ROLE_OPTIONS);

/** "Vinculado al expte. principal Nº …" de un incidente (RF-1), o null si no lo es. */
export function incidentLabel(
  causa: Pick<CausaResumen, 'esIncidente' | 'expedientePrincipal'>,
): string | null {
  return causa.esIncidente ? `Vinculado al expte. principal Nº ${causa.expedientePrincipal}` : null;
}

/** Nombre y apellido de una persona física, o razón social de una jurídica (RF-12). */
export function partyName(parte: ParteDetalle): string {
  if (parte.tipoPersona === 'juridica') return parte.razonSocial ?? '';
  return [parte.nombre, parte.apellido].filter(Boolean).join(' ');
}

/** "DNI 30.123.456" o "CUIT 30-71234567-1", o null si la parte no tiene documento. */
export function partyDocument(parte: Pick<ParteDetalle, 'dni' | 'cuit'>): string | null {
  if (parte.dni) return `DNI ${formatDni(parte.dni)}`;
  if (parte.cuit) return `CUIT ${formatCuit(parte.cuit)}`;
  return null;
}

/** "Apellido, Nombre", marcando a los desactivados (RF-32). */
export function memberName(member: IntegranteResumen): string {
  const name = `${member.apellido}, ${member.nombre}`;
  return member.activo ? name : `${name} (desactivado)`;
}

export const RESPONSABLE_WARNING =
  'El responsable de esta causa está desactivado. Asigná un nuevo responsable';

/** RF-33: el aviso se muestra mientras la causa está activa y su responsable desactivado. */
export function needsResponsableWarning(causa: Pick<CausaResumen, 'activa' | 'responsable'>) {
  return causa.activa && !causa.responsable.activo;
}
