/**
 * Datos de contacto del estudio (spec 004, RF-18 y RF-19). Son públicos y fijos, los mismos del
 * sitio web del estudio, y viven en el código (principio 5): no se editan desde el panel. El
 * sitio público (spec 007) usa esta misma fuente.
 */

export interface StudioContact {
  nombre: string;
  /** Se muestra como texto. */
  direccion: string;
  /** Número con código de país y de área, solo dígitos, como lo pide wa.me. */
  whatsapp: string;
}

// PENDIENTE: la dirección y el número de WhatsApp son genéricos. Reemplazarlos por los reales
// cuando el estudio los informe.
export const STUDIO_CONTACT: StudioContact = {
  nombre: 'Estudio Sabalette',
  direccion: 'Av. Ejemplo 1234, Ciudad Autónoma de Buenos Aires',
  whatsapp: '5491100000000',
};

/** Enlace que abre una conversación de WhatsApp con el estudio, sin mensaje precargado. */
export function whatsappUrl(contact: StudioContact = STUDIO_CONTACT): string {
  return `https://wa.me/${contact.whatsapp}`;
}
