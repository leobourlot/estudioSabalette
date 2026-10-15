import type { Transition } from 'motion/react';

/**
 * Las animaciones del sitio público (spec 007, RF-45; plan 007, "Animaciones"). Reglas puras:
 * qué se mueve, cuánto y durante cuánto tiempo, sin React.
 */

/** Cuánto sube un elemento al aparecer, en píxeles. */
export const RISE_PX = 16;

/** Duración máxima de una animación, en segundos (RF-45: como mucho 0,6). */
export const MAX_DURATION_S = 0.6;

/** Escalonado entre tarjetas de una misma fila, en segundos. */
export const STAGGER_S = 0.08;

/** Estado inicial y final de lo que aparece al entrar en la pantalla. */
export const APPEAR_HIDDEN = { opacity: 0, y: RISE_PX } as const;
export const APPEAR_SHOWN = { opacity: 1, y: 0 } as const;

/**
 * La transición de una aparición. Con la reducción de movimiento pedida en el dispositivo, dura 0:
 * el elemento aparece directamente, sin movimiento (RF-45).
 */
export function appearTransition(reduceMotion: boolean, delay = 0): Transition {
  if (reduceMotion) return { duration: 0 };
  return { duration: 0.5, ease: 'easeOut', delay: Math.min(delay, MAX_DURATION_S - 0.5) };
}

/** La transición del menú plegado y del contenido de las pestañas. */
export function switchTransition(reduceMotion: boolean): Transition {
  return reduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeOut' };
}
