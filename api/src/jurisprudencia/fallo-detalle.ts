import type { Fuero } from '../causas/causa.entity.js';
import { type AutorResumen, toAutorResumen } from '../movimientos/movimiento-detalle.js';
import type { Fallo } from './fallo.entity.js';
import type { PalabraClave } from './palabra-clave.entity.js';

/**
 * Respuestas de jurisprudencia (plan 005, "Tipos"). Se arman campo por campo, nunca a partir
 * de la entidad completa: así no salen emails ni hashes de las cuentas unidas, ni la clave
 * de comparación del catálogo.
 */

export interface PalabraClaveResumen {
  id: number;
  texto: string;
}

/** Sugerencia de palabra clave con la cantidad de fallos activos que la usan (RF-13). */
export interface PalabraClaveSugerencia extends PalabraClaveResumen {
  cantidad: number;
}

/** Fila del listado (RF-22). El sumario va completo: la interfaz lo recorta. */
export interface FalloResumen {
  id: number;
  caratula: string;
  tribunal: string;
  fuero: Fuero;
  fecha: string;
  numero: string | null;
  sumario: string;
  palabrasClave: PalabraClaveResumen[];
  activo: boolean;
}

/** Ficha de un fallo (RF-19). */
export interface FalloDetalle extends FalloResumen {
  enlace: string | null;
  creadoPor: AutorResumen;
  creadoEn: Date;
  modificadoPor: AutorResumen | null;
  modificadoEn: Date | null;
}

/** El fallo con el que coincide otro en el aviso de repetido (RF-18). */
export interface FalloReferencia {
  id: number;
  caratula: string;
  tribunal: string;
  fecha: string;
  numero: string | null;
}

// Orden alfabético en español, sin distinguir mayúsculas, minúsculas ni tildes.
const collator = new Intl.Collator('es', { sensitivity: 'base' });

export function toPalabraClaveResumen(palabra: PalabraClave): PalabraClaveResumen {
  return { id: palabra.id, texto: palabra.texto };
}

/** Las palabras clave del fallo, en orden alfabético. */
function sortedKeywords(palabras: readonly PalabraClave[]): PalabraClaveResumen[] {
  return palabras
    .map(toPalabraClaveResumen)
    .sort((a, b) => collator.compare(a.texto, b.texto) || a.id - b.id);
}

export function toFalloResumen(fallo: Fallo, palabras: readonly PalabraClave[]): FalloResumen {
  return {
    id: fallo.id,
    caratula: fallo.caratula,
    tribunal: fallo.tribunal,
    fuero: fallo.fuero,
    fecha: fallo.fecha,
    numero: fallo.numero,
    sumario: fallo.sumario,
    palabrasClave: sortedKeywords(palabras),
    activo: fallo.activo,
  };
}

/** Espera el fallo con creadoPor y modificadoPor cargados. */
export function toFalloDetalle(fallo: Fallo, palabras: readonly PalabraClave[]): FalloDetalle {
  return {
    ...toFalloResumen(fallo, palabras),
    enlace: fallo.enlace,
    creadoPor: toAutorResumen(fallo.creadoPor),
    creadoEn: fallo.creadoEn,
    modificadoPor: fallo.modificadoPor ? toAutorResumen(fallo.modificadoPor) : null,
    modificadoEn: fallo.modificadoEn,
  };
}

export function toFalloReferencia(fallo: Fallo): FalloReferencia {
  return {
    id: fallo.id,
    caratula: fallo.caratula,
    tribunal: fallo.tribunal,
    fecha: fallo.fecha,
    numero: fallo.numero,
  };
}

/** Fila de la consulta de sugerencias; MySQL puede devolver la cantidad como texto. */
export function toPalabraClaveSugerencia(fila: {
  id: number;
  texto: string;
  cantidad: number | string;
}): PalabraClaveSugerencia {
  return { id: Number(fila.id), texto: fila.texto, cantidad: Number(fila.cantidad) };
}
