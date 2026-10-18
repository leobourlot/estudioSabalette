import { useId } from 'react';

/**
 * Id único para un degradado o un recorte dentro de un SVG, igual en el prerenderizado y en el
 * navegador. Solo deja letras, números, "-" y "_", para que `url(#id)` funcione en todos los
 * navegadores.
 */
export function useIdSvg(prefix: string): string {
  return `${prefix}-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
}
