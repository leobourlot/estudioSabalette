import { REDES_DE_MUESTRA } from './redes-de-muestra';

/**
 * Datos de contacto del estudio (spec 007, RF-3 y RF-22 a RF-24; spec 004, RF-18 y RF-19). Son
 * públicos y fijos, y viven en el código (principio 5): no se editan desde el panel. Son la única
 * fuente del nombre y del contacto para el sitio público, el ingreso, el portal y el panel.
 */

export interface RedSocial {
  /** Nombre de la red, tal como se muestra (por ejemplo, "Instagram"). */
  red: string;
  /** La cuenta, como se muestra (por ejemplo, "@estudio"). Una red puede tener varias. */
  usuario: string;
  url: string;
}

export interface StudioContact {
  nombre: string;
  /** El nombre como se muestra en pantalla: la primera línea no se corta (RF-3). */
  nombreLineas: readonly [string, string];
  /** Número con código de país y de área, solo dígitos, como lo pide wa.me. */
  whatsapp: string;
  /** El mismo número, como se muestra. */
  whatsappVisible: string;
  /** Se muestra como texto. null mientras el estudio no la informe (RF-24). */
  direccion: string | null;
  /** Días y horarios de atención, un renglón por elemento. Vacío mientras no se informen. */
  horarios: readonly string[];
  email: string | null;
  redes: readonly RedSocial[];
}

// PENDIENTE (spec 007, dudas abiertas): dirección, horarios, email y redes. Hasta que el
// estudio los informe no se muestran, y nunca se reemplazan por datos de ejemplo (RF-24).
export const STUDIO_CONTACT: StudioContact = {
  nombre: 'Pertusatti | Sabalette - Abogadas',
  nombreLineas: ['Pertusatti | Sabalette', 'Abogadas'],
  whatsapp: '5493455414147',
  whatsappVisible: '+54 9 3455 41-4147',
  direccion: null,
  horarios: [],
  email: null,
  redes: [],
};

/**
 * Enlace que abre una conversación de WhatsApp con el estudio. Con un mensaje, lo deja escrito
 * para que el visitante lo cambie o lo envíe (spec 007, RF-27); sin mensaje, la abre vacía, como
 * en el ingreso y el portal (spec 004, RF-19).
 */
export function whatsappUrl(mensaje?: string, contact: StudioContact = STUDIO_CONTACT): string {
  const base = `https://wa.me/${contact.whatsapp}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** Enlace "Cómo llegar": la dirección en Google Maps (spec 007, RF-23). */
export function mapsUrl(direccion: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

/**
 * Las redes que se muestran: las del estudio o, si se pide y el estudio todavía no informó
 * ninguna, las de muestra (spec 007, RF-24). Regla pura, para los tests.
 */
export function pickNetworks(
  redes: readonly RedSocial[],
  muestra: readonly RedSocial[] | null,
): readonly RedSocial[] {
  return redes.length === 0 && muestra ? muestra : redes;
}

/**
 * Las redes del bloque de contacto y del pie. Las de muestra solo en la versión de desarrollo:
 * al construir para publicar, Vite reemplaza la condición por `false` y elimina la rama, así las
 * redes de muestra no quedan ni en el código publicado (spec 007, RF-24).
 */
export function networksToShow(contact: StudioContact = STUDIO_CONTACT): readonly RedSocial[] {
  if (import.meta.env.MODE === 'development') return pickNetworks(contact.redes, REDES_DE_MUESTRA);
  return contact.redes;
}
