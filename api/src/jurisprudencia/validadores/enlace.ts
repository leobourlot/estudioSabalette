/**
 * Reglas del enlace a la fuente de un fallo (spec 005, RF-6; plan 005, "Enlace a la
 * fuente"). Se valida con expresiones y no con `new URL()`, que normaliza (pasa a
 * minúsculas, codifica, acepta usuario y puerto) y aceptaría formas que la spec rechaza tal
 * como se escribieron.
 */

/** 'esquema': no empieza con https:// en minúsculas. 'formato': cualquier otra regla. */
export type LinkViolation = 'esquema' | 'formato';

const SCHEME = 'https://';

// Letras minúsculas sin tildes, números y guiones, con al menos un punto. Sin ":" (puerto)
// ni "@" (usuario).
const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

// Lo que sigue al dominio: letras sin tildes, números y los símbolos que usan las rutas y los
// parámetros. Excluye espacios, comillas, < > { } [ ] | \ ^, el acento grave, @ y emojis.
const AFTER_HOST = /^[A-Za-z0-9\-._~/?#&=%+!$()*,;:]*$/;

/** Primera regla de RF-6 que el enlace no cumple, o null si es válido. */
export function linkViolation(enlace: string): LinkViolation | null {
  const value = enlace.trim();
  if (!value.startsWith(SCHEME)) return 'esquema';

  const rest = value.slice(SCHEME.length);
  const hostEnd = rest.search(/[/?#]/);
  const host = hostEnd === -1 ? rest : rest.slice(0, hostEnd);
  const afterHost = hostEnd === -1 ? '' : rest.slice(hostEnd);

  if (!HOST.test(host)) return 'formato';
  const labels = host.split('.');
  const badLabel = labels.some(
    (label) => label.startsWith('-') || label.endsWith('-') || label.startsWith('xn--'),
  );
  if (badLabel) return 'formato';
  // Todas las partes numéricas: es una dirección IP.
  if (labels.every((label) => /^\d+$/.test(label))) return 'formato';

  return AFTER_HOST.test(afterHost) ? null : 'formato';
}
