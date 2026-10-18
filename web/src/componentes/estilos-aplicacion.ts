import { FOCUS_RING, PRIMARY_BUTTON } from './estilos-sitio';

/**
 * Clases de Tailwind que comparten el ingreso, el portal y el panel (spec 008, RF-3, RF-4 y
 * RF-21 a RF-24; plan 008, "Identidad visual"). Los contrastes están medidos en el plan.
 */

export { FOCUS_RING };

/** Foco sobre el azul del menú y del panel de la marca: en blanco. */
export const FOCUS_RING_ON_DARK =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-estudio-blanco';

/** Tarjeta blanca con borde y sombra suave (RF-4). */
export const CARD = 'rounded-xl border border-slate-300 bg-white shadow-sm';

/** Título principal de cada pantalla, con la tipografía de los títulos (RF-3). */
export const PAGE_TITLE = 'font-titulos text-3xl font-semibold text-estudio-oscuro';

/** Subtítulo de una sección dentro de una pantalla. */
export const SECTION_TITLE = 'font-titulos text-xl font-semibold text-estudio-oscuro';

/** Botón principal: el del sitio, azul oscuro con texto blanco y 44 px de alto. */
export { PRIMARY_BUTTON };

/** Botón principal más bajo, para el panel, que se usa con el mouse. */
export const PRIMARY_BUTTON_SMALL = `inline-flex min-h-9 items-center justify-center gap-1 rounded-md bg-estudio-oscuro px-4 text-sm font-medium text-estudio-blanco transition-colors hover:bg-estudio-azul disabled:opacity-60 motion-reduce:transition-none ${FOCUS_RING}`;

/** Botón secundario, con borde (el borde slate-500 contrasta 4,8 a 1 sobre blanco). */
export const SECONDARY_BUTTON = `inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-slate-500 bg-white px-4 text-sm font-medium text-estudio-oscuro transition-colors hover:bg-slate-50 disabled:opacity-50 motion-reduce:transition-none ${FOCUS_RING}`;

/** Botón secundario más bajo, para el panel. */
export const SECONDARY_BUTTON_SMALL = `inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-slate-500 bg-white px-3 text-sm font-medium text-estudio-oscuro transition-colors hover:bg-slate-50 disabled:opacity-50 motion-reduce:transition-none ${FOCUS_RING}`;

/** Enlace de texto dentro de las pantallas. */
export const TEXT_LINK = `rounded font-medium text-estudio-azul underline underline-offset-4 transition-colors hover:text-estudio-oscuro motion-reduce:transition-none ${FOCUS_RING}`;

/** Campo de texto, lista o área de texto. */
export const INPUT =
  'w-full rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900 focus:border-estudio-azul focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-estudio-azul';

/** Campo más bajo y sin ancho completo, para los filtros del panel. */
export const FIELD_SMALL =
  'rounded-md border border-slate-500 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-estudio-azul focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-estudio-azul';

/** Etiqueta de un campo. */
export const LABEL = 'block text-sm font-medium text-slate-700';

/** Etiqueta de estado (10,7 a 1). */
export const STATUS_BADGE =
  'inline-block rounded-full bg-estudio-azul/10 px-2.5 py-0.5 text-xs font-medium text-estudio-oscuro';

/** Aviso de error. */
export const ERROR_ALERT =
  'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800';

/** Tabla dentro de su tarjeta: se desplaza a lo ancho por dentro (RNF de plataformas). */
export const TABLE_CARD = `${CARD} overflow-x-auto`;
export const TABLE = 'w-full min-w-[48rem] text-left text-sm';
export const TABLE_HEAD = 'bg-slate-100 text-slate-700';
export const TABLE_HEADER_CELL = 'px-4 py-3 font-semibold';
export const TABLE_CELL = 'px-4 py-3 align-top';

/** Fila de una tabla: una línea visible arriba y resaltada al pasar el puntero (RF-21). */
export const TABLE_ROW =
  'border-t border-slate-300 transition-colors hover:bg-estudio-azul/5 motion-reduce:transition-none';

/** Contenido de una pantalla del portal o del panel. */
export const PAGE = 'mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8';
