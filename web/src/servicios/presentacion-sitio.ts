import { STUDIO_CONTACT } from './datos-estudio';

/**
 * Presentación del sitio público (spec 007): títulos de las páginas e iniciales de las
 * abogadas. No importa React (principio 3).
 */

/** Título de una página o pantalla: su nombre, " · " y el nombre del estudio (T-16, RF-34). */
export function pageTitle(nombre: string): string {
  return `${nombre} · ${STUDIO_CONTACT.nombre}`;
}

/**
 * Las iniciales de todas las palabras del nombre, en mayúsculas: "CP", "VSR". Se muestran en
 * lugar de la foto mientras falta, carga o no se puede cargar (spec 007, RF-21).
 */
export function initialsOf(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .filter((palabra) => palabra !== '')
    .map((palabra) => palabra.charAt(0).toLocaleUpperCase('es'))
    .join('');
}
