/**
 * Formato de los datos que se insertan en un escrito (spec 006, RF-34 a RF-36 y RF-9; plan 006,
 * "Completar un modelo"). Funciones puras, sin acceso a la base.
 */
import type { PartyIdentity } from '../causas/reglas-causas.js';

type PersonNameData = Pick<PartyIdentity, 'tipoPersona' | 'nombre' | 'apellido' | 'razonSocial'>;

/** RF-34: "Nombre Apellido" de una persona física, o la razón social de una jurídica. */
export function personName(person: PersonNameData): string {
  if (person.tipoPersona === 'juridica') return person.razonSocial ?? '';
  return `${person.nombre ?? ''} ${person.apellido ?? ''}`.trim();
}

/**
 * RF-35: "DNI" y el número con puntos de miles. Se escriben todos los dígitos guardados,
 * incluido un cero inicial.
 */
export function formatDni(dni: string): string {
  return `DNI ${dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** RF-35: "CUIT" y el número con guiones. */
export function formatCuit(cuit: string): string {
  return `CUIT ${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}

/**
 * RF-36: enumera a varias personas. Dos van unidas solo por "y". Tres o más van separadas por
 * comas o, si cada una lleva un detalle con su propia coma (documento o domicilio), por punto y
 * coma; siempre con "y" antes de la última.
 */
export function joinPeople(people: readonly string[], detailed: boolean): string {
  if (people.length <= 2) return people.join(' y ');
  const last = people[people.length - 1];
  const rest = people.slice(0, -1);
  return detailed ? `${rest.join('; ')}; y ${last}` : `${rest.join(', ')} y ${last}`;
}

// Sin distinguir mayúsculas, minúsculas ni tildes (RF-36), como el orden de las partes del portal.
const collator = new Intl.Collator('es', { sensitivity: 'base' });

/** Lo que hace falta de una persona para ordenarla. */
export interface PersonSortKeys {
  /** Apellido, o razón social: se ordenan juntos. */
  claveApellido: string;
  claveNombre: string;
}

export function personSortKeys(person: PersonNameData): PersonSortKeys {
  return person.tipoPersona === 'juridica'
    ? { claveApellido: person.razonSocial ?? '', claveNombre: '' }
    : { claveApellido: person.apellido ?? '', claveNombre: person.nombre ?? '' };
}

/**
 * RF-36: por apellido o razón social y después por nombre. A igual nombre, primero la parte que
 * se cargó antes en la causa: su id es el orden de registro.
 */
export function comparePeople(
  a: PersonSortKeys & { id: number },
  b: PersonSortKeys & { id: number },
): number {
  return (
    collator.compare(a.claveApellido, b.claveApellido) ||
    collator.compare(a.claveNombre, b.claveNombre) ||
    a.id - b.id
  );
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** Un día AAAA-MM-DD como dd/mm/aaaa. Se reordena el texto, sin pasar por Date. */
export function formatDate(fecha: string): string {
  const [year, month, day] = fecha.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Un día AAAA-MM-DD en letras: el día sin cero inicial, el mes en minúsculas y el año
 * ("1 de marzo de 2026"). El mes sale de una tabla fija, para no depender de los datos de
 * idioma del servidor.
 */
export function formatDateInWords(fecha: string): string {
  const [year, month, day] = fecha.split('-');
  return `${Number(day)} de ${MONTHS[Number(month) - 1]} de ${year}`;
}
