/**
 * Textos de un fallo en la web (spec 005): las mismas conversiones (RF-3), reglas de
 * caracteres (RF-4, RF-5), comparación flexible (RF-9) y reglas del enlace (RF-6) que la API
 * (api/src/jurisprudencia/validadores y reglas-jurisprudencia.ts). La API sigue siendo la
 * fuente de verdad. No importa React (principio 3).
 */

/** Caracteres que se reemplazan, uno por uno, por su equivalente permitido. */
export const TYPOGRAPHIC_REPLACEMENTS: Readonly<Record<string, string>> = {
  // Comillas dobles tipográficas.
  '“': '"',
  '”': '"',
  '„': '"',
  '‟': '"',
  '«': '"',
  '»': '"',
  '″': '"',
  // Comillas simples, apóstrofos y signos parecidos.
  '‘': "'",
  '’': "'",
  '‚': "'",
  '‛': "'",
  '‹': "'",
  '›': "'",
  '′': "'",
  '´': "'",
  // Guiones y signo menos.
  '‐': '-',
  '‑': '-',
  '‒': '-',
  '–': '-',
  '—': '-',
  '―': '-',
  '−': '-',
  // Viñetas.
  '•': '-',
  '◦': '-',
  '‣': '-',
  '▪': '-',
  '…': '...',
  '№': 'Nº',
  // Los corchetes nunca se guardan: solo se aceptan convertidos en paréntesis.
  '[': '(',
  ']': ')',
  // Espacios especiales y tabulación.
  '\u00A0': ' ',
  '\u1680': ' ',
  '\u2000': ' ',
  '\u2001': ' ',
  '\u2002': ' ',
  '\u2003': ' ',
  '\u2004': ' ',
  '\u2005': ' ',
  '\u2006': ' ',
  '\u2007': ' ',
  '\u2008': ' ',
  '\u2009': ' ',
  '\u200A': ' ',
  '\u202F': ' ',
  '\u205F': ' ',
  '\u3000': ' ',
  '\t': ' ',
};

// Los corchetes y la barra invertida se escapan para usarlos dentro de una clase de caracteres.
const REPLACEABLE = new RegExp(
  `[${Object.keys(TYPOGRAPHIC_REPLACEMENTS)
    .map((character) => character.replace(/[\]\\^[-]/g, '\\$&'))
    .join('')}]`,
  'gu',
);

// Espacio de ancho cero, no unión y unión de ancho cero, unión de palabras, guion de corte
// opcional y marca de orden de bytes.
const INVISIBLE = /[\u200B\u200C\u200D\u2060\u00AD\uFEFF]/gu;

// Separadores de línea y de párrafo Unicode.
const LINE_SEPARATORS = /[\u2028\u2029]/gu;

export interface ConvertOptions {
  /** true solo para el sumario; la carátula, el tribunal, el número, las palabras clave y la búsqueda son de una línea. */
  multilinea: boolean;
}

/** §§ pasa a "párrs." y § a "párr.", con un espacio si lo sigue otro carácter (RF-3). */
function replaceParagraphSigns(value: string): string {
  return value.replace(/§§?/gu, (match: string, offset: number, whole: string) => {
    const word = match === '§§' ? 'párrs.' : 'párr.';
    const next = whole[offset + match.length];
    return next === undefined || next === ' ' || next === '\n' ? word : `${word} `;
  });
}

/**
 * Aplica las conversiones de RF-3 en el orden del plan: NFC, saltos de línea, invisibles,
 * tabla de reemplazos, signo de párrafo, saltos de línea de los textos de una línea,
 * espacios repetidos y extremos.
 */
export function convertText(value: string, { multilinea }: ConvertOptions): string {
  let text = value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(LINE_SEPARATORS, '\n')
    .replace(INVISIBLE, '')
    .replace(REPLACEABLE, (character) => TYPOGRAPHIC_REPLACEMENTS[character] ?? character);
  text = replaceParagraphSigns(text);
  if (!multilinea) text = text.replace(/\n/g, ' ');
  // Solo se reducen los espacios: los saltos de línea y las líneas en blanco del sumario
  // quedan como se cargaron.
  text = text.replace(/ {2,}/g, ' ');
  return text.replace(multilinea ? /^[ \n]+|[ \n]+$/g : /^ +| +$/g, '');
}

// --- Caracteres y largos (RF-1, RF-4, RF-5) ---

export const MAX_CARATULA_LENGTH = 255;
export const MAX_TRIBUNAL_LENGTH = 150;
export const MAX_NUMERO_LENGTH = 50;
export const MAX_SUMARIO_LENGTH = 5000;
export const MAX_KEYWORD_LENGTH = 50;
export const MAX_KEYWORDS = 10;
export const MAX_LINK_LENGTH = 500;
export const MAX_SEARCH_LENGTH = 100;

// Las mismas expresiones que las causas (spec 002, RF-4) y los movimientos (spec 003, RF-4):
// ninguna acepta < > { } [ ] \ | = ni el acento grave.
const SINGLE_LINE_CHARACTERS = /^[\p{L}\p{N} .,;:/\-_()"'$&#°ºª]*$/u;
const SUMARIO_CHARACTERS = /^[\p{L}\p{N} \n.,;:/\-_()"'$&#°ºª¿?¡!%]*$/u;

/** Carátula, tribunal, número y palabras clave, ya convertidos (RF-4, RF-10). */
export const hasOnlySingleLineCharacters = (value: string) => SINGLE_LINE_CHARACTERS.test(value);

/** Sumario y texto del buscador, ya convertidos (RF-5, RF-24). */
export const hasOnlySumarioCharacters = (value: string) => SUMARIO_CHARACTERS.test(value);

/** Largo en caracteres (puntos de código), como lo cuentan la API y la base. */
export const textLength = (value: string) => [...value].length;

// --- Comparación flexible (RF-9) ---

/**
 * Forma de comparación flexible: el texto convertido, sin marcas diacríticas y en minúsculas.
 * Al quitar las marcas, la ñ pasa a n, la ü a u y las vocales con tilde a su vocal. Dos
 * palabras clave con la misma clave son la misma (RF-11).
 */
export function flexibleKey(texto: string): string {
  return convertText(texto, { multilinea: false })
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .normalize('NFC');
}

/** Las palabras clave sin repetidas por comparación flexible, en su primera aparición (RF-14). */
export function uniqueKeywords(textos: readonly string[]): string[] {
  const seen = new Set<string>();
  return textos.filter((texto) => {
    const key = flexibleKey(texto);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Enlace a la fuente (RF-6) ---

/** 'esquema': no empieza con https:// en minúsculas. 'formato': cualquier otra regla. */
export type LinkViolation = 'esquema' | 'formato';

const SCHEME = 'https://';

// Letras minúsculas sin tildes, números y guiones, con al menos un punto. Sin ":" (puerto)
// ni "@" (usuario).
const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

// Lo que sigue al dominio: letras sin tildes, números y los símbolos que usan las rutas y los
// parámetros. Excluye espacios, comillas, < > { } [ ] | \ ^, el acento grave, @ y emojis.
const AFTER_HOST = /^[A-Za-z0-9\-._~/?#&=%+!$()*,;:]*$/;

/** El dominio y lo que le sigue, o null si el enlace no empieza con https://. */
function splitLink(enlace: string): { host: string; afterHost: string } | null {
  const value = enlace.trim();
  if (!value.startsWith(SCHEME)) return null;
  const rest = value.slice(SCHEME.length);
  const hostEnd = rest.search(/[/?#]/);
  return hostEnd === -1
    ? { host: rest, afterHost: '' }
    : { host: rest.slice(0, hostEnd), afterHost: rest.slice(hostEnd) };
}

/**
 * Primera regla de RF-6 que el enlace no cumple, o null si es válido. Como en la API, se
 * valida con expresiones y no con `new URL()`, que normaliza y aceptaría formas que la spec
 * rechaza tal como se escribieron.
 */
export function linkViolation(enlace: string): LinkViolation | null {
  const parts = splitLink(enlace);
  if (!parts) return 'esquema';

  if (!HOST.test(parts.host)) return 'formato';
  const labels = parts.host.split('.');
  const badLabel = labels.some(
    (label) => label.startsWith('-') || label.endsWith('-') || label.startsWith('xn--'),
  );
  if (badLabel) return 'formato';
  // Todas las partes numéricas: es una dirección IP.
  if (labels.every((label) => /^\d+$/.test(label))) return 'formato';

  return AFTER_HOST.test(parts.afterHost) ? null : 'formato';
}

/**
 * Dominio al que lleva un enlace válido, para mostrarlo destacado junto a la dirección
 * (RF-19). null si el enlace no cumple RF-6: en ese caso no se muestra como enlace.
 */
export function linkDomain(enlace: string): string | null {
  if (linkViolation(enlace) !== null) return null;
  return splitLink(enlace)?.host ?? null;
}
