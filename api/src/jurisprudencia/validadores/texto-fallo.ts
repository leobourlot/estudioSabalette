/**
 * Conversiones de los textos de un fallo (spec 005, RF-3; plan 005, "Conversiones y
 * textos"). Convierten los caracteres que traen los textos copiados de otras fuentes en sus
 * equivalentes permitidos. Después se validan con las reglas de caracteres de las specs 002
 * y 003, que rechazan todo lo que esta tabla no convierte.
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
