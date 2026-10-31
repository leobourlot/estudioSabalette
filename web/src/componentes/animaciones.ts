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

/*
 * La secuencia de la maqueta del portal del inicio (spec 007, RF-47), en bucle mientras está en
 * la pantalla: aparece la ventana con el ingreso, se tipean el DNI y la contraseña, el puntero
 * elige "Ingresar", el ingreso da paso a la causa y sus movimientos aparecen de a uno, del más
 * antiguo (abajo) al más reciente (arriba). La causa completa queda quieta un rato y la maqueta
 * vuelve al ingreso vacío. Todo sale del tiempo transcurrido, en segundos.
 */

/** Duración de la aparición de la ventana, en segundos. */
export const MOCKUP_WINDOW_S = 0.5;

/** Cuánto tarda cada carácter del DNI y cada punto de la contraseña, en segundos. */
export const MOCKUP_DOCUMENT_CHAR_S = 0.05;
export const MOCKUP_PASSWORD_CHAR_S = 0.07;

/** Duración de cada fundido (puntero, cambio de vista y cada movimiento), en segundos. */
export const MOCKUP_FADE_S = 0.4;

/** Cuánto dura el botón presionado, en segundos. */
export const MOCKUP_PRESS_S = 0.2;

/** Separación entre un movimiento y el siguiente, en segundos. */
export const MOCKUP_MOVEMENT_GAP_S = 0.45;

/** Cuánto queda quieta la causa completa antes de volver al ingreso, en segundos. */
export const MOCKUP_HOLD_S = 4;

/** Cuánto sube la ventana y cada movimiento al aparecer, en píxeles. */
export const MOCKUP_MOVEMENT_RISE_PX = 8;

/** Los momentos de la secuencia, en segundos desde que la maqueta entra en la pantalla. */
export interface MockupTimeline {
  documentStart: number;
  passwordStart: number;
  pointerStart: number;
  pressStart: number;
  portalStart: number;
  /** Cuándo empieza cada movimiento, con 0 el de arriba (el más reciente). */
  movementStarts: number[];
  end: number;
}

/** Los momentos de la secuencia para un DNI, una contraseña y una cantidad de movimientos. */
export function mockupTimeline(
  documentLength: number,
  passwordLength: number,
  movementCount: number,
): MockupTimeline {
  const documentStart = MOCKUP_WINDOW_S + 0.1;
  const passwordStart = documentStart + documentLength * MOCKUP_DOCUMENT_CHAR_S + 0.15;
  const pointerStart = passwordStart + passwordLength * MOCKUP_PASSWORD_CHAR_S + 0.1;
  const pressStart = pointerStart + MOCKUP_FADE_S;
  const portalStart = pressStart + MOCKUP_PRESS_S + 0.1;
  const movementStarts = Array.from(
    { length: movementCount },
    (_, index) => portalStart + 0.3 + (movementCount - 1 - index) * MOCKUP_MOVEMENT_GAP_S,
  );
  const end = Math.max(
    portalStart + MOCKUP_FADE_S,
    ...movementStarts.map((s) => s + MOCKUP_FADE_S),
  );
  return {
    documentStart,
    passwordStart,
    pointerStart,
    pressStart,
    portalStart,
    movementStarts,
    end,
  };
}

/** Lo que aparece: su opacidad y cuánto le falta subir, en píxeles. */
export interface MockupFade {
  opacity: number;
  y: number;
}

/** Cómo se ve la maqueta en un momento de la secuencia. */
export interface MockupFrame {
  ventana: MockupFade;
  /** Opacidad del ingreso y de la causa: están en el mismo lugar, una sobre la otra. */
  ingreso: number;
  portal: number;
  /** Caracteres del DNI y puntos de la contraseña ya tipeados. */
  documentChars: number;
  passwordChars: number;
  /** El campo donde se está tipeando, que muestra el cursor de texto. */
  cursor: 'documento' | 'contrasena' | null;
  puntero: MockupFade;
  presionado: boolean;
  movimientos: MockupFade[];
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/** El avance de 0 a 1 de algo que empieza en `start` y dura `duration`, con desaceleración. */
function eased(t: number, start: number, duration: number): number {
  const p = clamp((t - start) / duration);
  return 1 - (1 - p) ** 3;
}

function fade(t: number, start: number, duration: number, rise: number): MockupFade {
  const p = eased(t, start, duration);
  return { opacity: p, y: rise * (1 - p) };
}

/**
 * La maqueta en el momento `t`. Con `t` infinito (sin animaciones, con la reducción de
 * movimiento pedida o terminada la secuencia) es la causa completa.
 */
export function mockupFrame(
  t: number,
  timeline: MockupTimeline,
  documentLength: number,
  passwordLength: number,
): MockupFrame {
  const { documentStart, passwordStart, pointerStart, pressStart, portalStart } = timeline;
  const typed = (start: number, perChar: number, length: number) =>
    Math.min(length, Math.max(0, Math.floor((t - start) / perChar)));
  const portal = eased(t, portalStart, MOCKUP_FADE_S);
  let cursor: MockupFrame['cursor'] = null;
  if (t >= documentStart && t < passwordStart) cursor = 'documento';
  else if (t >= passwordStart && t < pointerStart) cursor = 'contrasena';
  return {
    ventana: fade(t, 0, MOCKUP_WINDOW_S, RISE_PX),
    ingreso: 1 - portal,
    portal,
    documentChars: typed(documentStart, MOCKUP_DOCUMENT_CHAR_S, documentLength),
    passwordChars: typed(passwordStart, MOCKUP_PASSWORD_CHAR_S, passwordLength),
    cursor,
    puntero: fade(t, pointerStart, MOCKUP_FADE_S, 12),
    presionado: t >= pressStart && t < pressStart + MOCKUP_PRESS_S,
    movimientos: timeline.movementStarts.map((start) =>
      fade(t, start, MOCKUP_FADE_S, MOCKUP_MOVEMENT_RISE_PX),
    ),
  };
}

/** Lo que dura cada vuelta del bucle: la secuencia y la causa quieta, en segundos. */
export function mockupCycle(timeline: MockupTimeline): number {
  return timeline.end + MOCKUP_HOLD_S;
}

/**
 * La maqueta en bucle, `elapsed` segundos después de entrar en la pantalla. La primera vuelta es
 * la secuencia tal cual, con la aparición de la ventana. En las siguientes la ventana ya está a la
 * vista: la causa completa se desvanece sobre el ingreso vacío y la secuencia sigue desde ahí.
 * Con `elapsed` infinito (la reducción de movimiento pedida) es la causa completa, quieta.
 */
export function mockupLoopFrame(
  elapsed: number,
  timeline: MockupTimeline,
  documentLength: number,
  passwordLength: number,
): MockupFrame {
  const cycle = mockupCycle(timeline);
  if (!Number.isFinite(elapsed) || elapsed < cycle) {
    return mockupFrame(elapsed, timeline, documentLength, passwordLength);
  }
  const t = elapsed % cycle;
  const frame = mockupFrame(t, timeline, documentLength, passwordLength);
  const shown = { opacity: 1, y: 0 };
  if (t >= MOCKUP_FADE_S) return { ...frame, ventana: shown };
  const back = eased(t, 0, MOCKUP_FADE_S);
  return {
    ...frame,
    ventana: shown,
    ingreso: back,
    portal: 1 - back,
    movimientos: frame.movimientos.map(() => shown),
  };
}

/*
 * Las animaciones del ingreso, el portal y el panel (spec 008, RF-26 y RF-27; plan 008,
 * "Animaciones"), con los mismos límites que las del sitio público.
 */

/** Estado inicial y final de una pantalla o de un elemento de una lista al aparecer. */
export const PAGE_ENTER = { opacity: 0, y: 8 } as const;
export const PAGE_SHOWN = { opacity: 1, y: 0 } as const;

/** Duración de la aparición de una pantalla o de un elemento de una lista, en segundos. */
export const PAGE_DURATION_S = 0.3;

/**
 * El retraso del elemento `index` de una lista escalonada: crece de a STAGGER_S y se corta para
 * que ninguna aparición termine después de MAX_DURATION_S (RF-27).
 */
export function staggerDelay(index: number): number {
  return Math.min(Math.max(index, 0) * STAGGER_S, MAX_DURATION_S - PAGE_DURATION_S);
}

/** La transición de una pantalla o de un elemento de una lista. Con la reducción, dura 0. */
export function pageTransition(reduceMotion: boolean, index = 0): Transition {
  if (reduceMotion) return { duration: 0 };
  return { duration: PAGE_DURATION_S, ease: 'easeOut', delay: staggerDelay(index) };
}
