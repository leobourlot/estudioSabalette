import type { Causa, Fuero } from '../causas/causa.entity.js';
import { type AutorResumen, toAutorResumen } from '../movimientos/movimiento-detalle.js';
import type { CompletedText } from './completar-escrito.js';
import type { ModeloEscrito, TipoEscrito } from './modelo-escrito.entity.js';
import { usedVariables, type VariableName } from './variables.js';

/**
 * Respuestas de los modelos de escritos (plan 006, "Tipos"). Se arman campo por campo, nunca
 * a partir de la entidad completa: así no salen emails ni hashes de las cuentas unidas, ni
 * datos de la causa o de sus partes fuera del escrito completado (RF-33).
 */

/** Fila del listado (RF-19). No lleva el texto. */
export interface ModeloResumen {
  id: number;
  titulo: string;
  tipo: TipoEscrito;
  fuero: Fuero;
  descripcion: string | null;
  activo: boolean;
}

/** Ficha de un modelo (RF-16). */
export interface ModeloDetalle extends ModeloResumen {
  /** Con las marcas de variable sin reemplazar. */
  texto: string;
  /** Variables del catálogo que usa el texto, sin repetir y en el orden en que aparecen. */
  variables: VariableName[];
  creadoPor: AutorResumen;
  creadoEn: Date;
  modificadoPor: AutorResumen | null;
  modificadoEn: Date | null;
}

/** Un modelo con el que coincide el título de otro, en el aviso de repetido (RF-15). */
export interface ModeloReferencia {
  id: number;
  titulo: string;
  tipo: TipoEscrito;
  fuero: Fuero;
}

/**
 * Un modelo completado con los datos de una causa (RF-32). No lleva ningún otro dato de la
 * causa, de sus partes ni de las cuentas de sus clientes (RF-33).
 */
export interface EscritoCompletado extends CompletedText {
  causa: { id: number; caratula: string };
  modelo: { id: number; titulo: string };
}

export function toModeloResumen(modelo: Pick<ModeloEscrito, keyof ModeloResumen>): ModeloResumen {
  return {
    id: modelo.id,
    titulo: modelo.titulo,
    tipo: modelo.tipo,
    fuero: modelo.fuero,
    descripcion: modelo.descripcion,
    activo: modelo.activo,
  };
}

/** Espera el modelo con creadoPor y modificadoPor cargados. */
export function toModeloDetalle(modelo: ModeloEscrito): ModeloDetalle {
  return {
    ...toModeloResumen(modelo),
    texto: modelo.texto,
    variables: usedVariables(modelo.texto),
    creadoPor: toAutorResumen(modelo.creadoPor),
    creadoEn: modelo.creadoEn,
    modificadoPor: modelo.modificadoPor ? toAutorResumen(modelo.modificadoPor) : null,
    modificadoEn: modelo.modificadoEn,
  };
}

export function toModeloReferencia(
  modelo: Pick<ModeloEscrito, keyof ModeloReferencia>,
): ModeloReferencia {
  return { id: modelo.id, titulo: modelo.titulo, tipo: modelo.tipo, fuero: modelo.fuero };
}

export function toEscritoCompletado(
  causa: Pick<Causa, 'id' | 'caratula'>,
  modelo: Pick<ModeloEscrito, 'id' | 'titulo'>,
  completed: CompletedText,
): EscritoCompletado {
  return {
    causa: { id: causa.id, caratula: causa.caratula },
    modelo: { id: modelo.id, titulo: modelo.titulo },
    texto: completed.texto,
    faltantes: completed.faltantes,
    clientesDesactivados: completed.clientesDesactivados,
    responsableDesactivado: completed.responsableDesactivado,
  };
}
