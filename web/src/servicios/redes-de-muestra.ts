import type { RedSocial } from './datos-estudio';

/**
 * Redes de muestra, solo para la versión de desarrollo (spec 007, RF-24): permiten ver cómo
 * quedan el bloque de contacto y el pie de página mientras el estudio no informe sus redes. Los
 * enlaces llevan a la página principal de cada red, nunca a la cuenta de alguien. El sitio
 * publicado nunca las incluye (datos-estudio.ts, networksToShow).
 */
export const REDES_DE_MUESTRA: readonly RedSocial[] = [
  { red: 'Instagram', usuario: '@cuenta-de-muestra', url: 'https://www.instagram.com/' },
  { red: 'Facebook', usuario: '@cuenta-de-muestra', url: 'https://www.facebook.com/' },
  { red: 'X', usuario: '@cuenta-de-muestra', url: 'https://x.com/' },
  { red: 'LinkedIn', usuario: '@cuenta-de-muestra', url: 'https://www.linkedin.com/' },
];
