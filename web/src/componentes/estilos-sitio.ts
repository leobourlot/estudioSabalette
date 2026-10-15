/**
 * Clases de Tailwind que comparten los componentes del sitio público (spec 007, RNF de
 * accesibilidad y RF-3).
 */

/** Foco visible del color del estudio, solo con el teclado. */
export const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-estudio-azul';

/** Botón principal: azul oscuro del logo con texto blanco, al menos 44 px de alto. */
export const PRIMARY_BUTTON = `inline-flex min-h-11 items-center justify-center rounded bg-estudio-oscuro px-4 font-medium text-estudio-blanco transition-colors hover:bg-estudio-azul motion-reduce:transition-none ${FOCUS_RING}`;

/** Enlace de texto, subrayado, con al menos 44 px de alto para el dedo. */
export const TEXT_LINK = `inline-flex min-h-11 items-center font-medium text-estudio-azul underline underline-offset-4 transition-colors hover:text-estudio-oscuro motion-reduce:transition-none ${FOCUS_RING}`;
