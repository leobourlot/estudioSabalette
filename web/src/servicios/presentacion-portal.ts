import type { CausaPortalResumen, GrupoCausa, MovimientoCliente } from './portal';

/**
 * Presentación del portal del cliente (plan 004, "Comportamiento de la interfaz"). No importa
 * React (principio 3).
 */

const GROUP_TITLES: Record<GrupoCausa, string> = {
  en_curso: 'En curso',
  archivadas_y_finalizadas: 'Archivadas y finalizadas',
};

export interface GrupoDeCausas {
  grupo: GrupoCausa;
  titulo: string;
  causas: CausaPortalResumen[];
}

/**
 * Agrupa una página de causas, ya ordenada por la API, con el título de cada grupo. Un grupo que
 * sigue en la página siguiente repite su título allí, y un grupo sin causas no aparece (RF-10).
 */
export function groupCausas(items: CausaPortalResumen[]): GrupoDeCausas[] {
  const groups: GrupoDeCausas[] = [];
  for (const causa of items) {
    const last = groups.at(-1);
    if (last?.grupo === causa.grupo) last.causas.push(causa);
    else groups.push({ grupo: causa.grupo, titulo: GROUP_TITLES[causa.grupo], causas: [causa] });
  }
  return groups;
}

export const NOT_ASSIGNED = 'Sin asignar';

/** Un dato opcional de la causa, o "Sin asignar" si no está informado (RF-9, RF-13). */
export const orNotAssigned = (value: string | null): string => value ?? NOT_ASSIGNED;

/** "Anulado" o "Fecha futura"; un anulado muestra solo "Anulado" (RF-21). */
export function movementLegend(
  movimiento: Pick<MovimientoCliente, 'anulado' | 'esFechaFutura'>,
): string | null {
  if (movimiento.anulado) return 'Anulado';
  return movimiento.esFechaFutura ? 'Fecha futura' : null;
}

/** Caracteres del texto de un movimiento que se muestran antes de "Ver más" (RF-21). */
export const CLIENT_TEXT_PREVIEW_LENGTH = 300;

/** El texto recortado en puntos de código, con "…", e indica si se recortó (RF-21). */
export function truncateClientText(texto: string): { texto: string; recortado: boolean } {
  const characters = [...texto];
  if (characters.length <= CLIENT_TEXT_PREVIEW_LENGTH) return { texto, recortado: false };
  return {
    texto: `${characters.slice(0, CLIENT_TEXT_PREVIEW_LENGTH).join('')}…`,
    recortado: true,
  };
}

/**
 * Página indicada en la dirección (`?pagina=`): sin parámetro, la 1; un entero desde 1, ese; y
 * cualquier otra cosa, null. Con null la pantalla no pide nada ni muestra mensajes de vacío,
 * como ante una página inexistente (RF-25).
 */
export function parsePageParam(value: string | null): number | null {
  if (value === null) return 1;
  return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}
