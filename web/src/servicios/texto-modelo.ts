/**
 * Textos y variables de un modelo de escrito en la web (spec 006): las mismas conversiones
 * (RF-3), reglas de caracteres (RF-4), catálogo de variables (RF-9) y reglas de las marcas
 * (RF-7, RF-8, RF-10) que la API (api/src/modelos-escritos/validadores/texto-modelo.ts y
 * variables.ts). La API sigue siendo la fuente de verdad. No importa React (principio 3).
 */
import { convertText, flexibleKey } from './texto-fallo';

// --- Largos (RF-1, RF-21) ---

export const MAX_TITULO_LENGTH = 150;
export const MAX_DESCRIPCION_LENGTH = 500;
export const MAX_TEXTO_LENGTH = 50_000;
export const MAX_SEARCH_LENGTH = 100;

// --- Texto del modelo (RF-3 a RF-5) ---

/** Símbolos permitidos en el texto de un modelo (RF-4): los de un movimiento más @. */
export const ALLOWED_TEXT_SYMBOLS = '. , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! % @';

// Letras de cualquier alfabeto (incluidas las que llevan tilde, la ñ y la ü), números, el
// espacio común, el salto de línea y los símbolos de ALLOWED_TEXT_SYMBOLS. Excluye emojis,
// tabulaciones y los signos que permiten inyectar código (< > { } [ ] \ | = `).
const ALLOWED_TEXT_CHARACTERS = /^[\p{L}\p{N} \n.,;:/\-_()"'$&#°ºª¿?¡!%@]*$/u;

/**
 * Texto de un modelo: las conversiones de la spec 005 en varias líneas y, además, sin espacios
 * al inicio ni al final de cada línea, porque un modelo es texto plano y no guarda sangría
 * (RF-3, RF-5). convertText ya redujo los espacios repetidos y quitó los saltos de línea de los
 * extremos; las líneas en blanco intermedias quedan como se cargaron.
 */
export function convertModelText(value: string): string {
  return convertText(value, { multilinea: true }).replace(/ *\n */g, '\n');
}

/** Texto ya convertido con convertModelText (RF-4). */
export function hasOnlyModelTextCharacters(value: string): boolean {
  return ALLOWED_TEXT_CHARACTERS.test(value);
}

// --- Variables (RF-7 a RF-12) ---

export type VariableGroup = 'causa' | 'partes' | 'clientes' | 'abogados' | 'fecha';

export interface VariableDefinition {
  /** En mayúsculas, sin tildes y con guion bajo entre palabras. */
  nombre: string;
  grupo: VariableGroup;
  /** Lo que pone en el escrito; se muestra al cargar un modelo (RF-11). */
  descripcion: string;
}

/** Catálogo fijo de RF-9. No se administra desde el panel. */
export const VARIABLES = [
  { nombre: 'CARATULA', grupo: 'causa', descripcion: 'La carátula de la causa' },
  { nombre: 'NUMERO_EXPEDIENTE', grupo: 'causa', descripcion: 'El número de expediente' },
  { nombre: 'JUZGADO', grupo: 'causa', descripcion: 'El juzgado' },
  { nombre: 'FUERO', grupo: 'causa', descripcion: 'El fuero de la causa' },
  {
    nombre: 'EXPEDIENTE_PRINCIPAL',
    grupo: 'causa',
    descripcion: 'El número del expediente principal de un incidente',
  },
  { nombre: 'ACTORES', grupo: 'partes', descripcion: 'Los nombres de los actores' },
  { nombre: 'DEMANDADOS', grupo: 'partes', descripcion: 'Los nombres de los demandados' },
  { nombre: 'TERCEROS', grupo: 'partes', descripcion: 'Los nombres de los terceros' },
  {
    nombre: 'ACTORES_CON_DOCUMENTO',
    grupo: 'partes',
    descripcion: 'Los actores, cada uno con su DNI o CUIT',
  },
  {
    nombre: 'DEMANDADOS_CON_DOCUMENTO',
    grupo: 'partes',
    descripcion: 'Los demandados, cada uno con su DNI o CUIT',
  },
  {
    nombre: 'TERCEROS_CON_DOCUMENTO',
    grupo: 'partes',
    descripcion: 'Los terceros, cada uno con su DNI o CUIT',
  },
  {
    nombre: 'CLIENTES',
    grupo: 'clientes',
    descripcion: 'Los nombres de las partes que son clientes del estudio',
  },
  {
    nombre: 'CLIENTES_CON_DOCUMENTO',
    grupo: 'clientes',
    descripcion: 'Los clientes, cada uno con su DNI o CUIT',
  },
  {
    nombre: 'CLIENTES_DOMICILIO',
    grupo: 'clientes',
    descripcion: 'El domicilio de cada cliente',
  },
  {
    nombre: 'ABOGADO_RESPONSABLE',
    grupo: 'abogados',
    descripcion: 'Nombre y apellido del responsable de la causa',
  },
  { nombre: 'FECHA', grupo: 'fecha', descripcion: 'El día de hoy, como 10/10/2026' },
  {
    nombre: 'FECHA_EN_LETRAS',
    grupo: 'fecha',
    descripcion: 'El día de hoy, como 10 de octubre de 2026',
  },
] as const satisfies readonly VariableDefinition[];

export type VariableName = (typeof VARIABLES)[number]['nombre'];

const VARIABLE_NAMES: ReadonlySet<string> = new Set(VARIABLES.map((variable) => variable.nombre));

export function isVariableName(clave: string): clave is VariableName {
  return VARIABLE_NAMES.has(clave);
}

// Nombre de una marca (RF-7): solo letras y guiones bajos, con al menos una letra. La letra se
// exige mirando hacia adelante y el resto es una sola repetición, para que la expresión recorra
// el texto una vez: con dos repeticiones encadenadas, un "#" seguido de miles de letras sin
// cerrar la haría tardar segundos.
const NAME = '(?=_*\\p{L})[\\p{L}_]+';

const mark = () => new RegExp(`#(${NAME})#`, 'gu');

// Una marca seguida de inmediato por otra ("#A##B#") o por un nombre y un numeral ("#A#B#").
const JOINED_MARKS = new RegExp(`#${NAME}##?${NAME}#`, 'u');

/**
 * Forma del catálogo de un nombre (RF-8): con la comparación flexible de la spec 005 (sin
 * tildes ni diéresis) y en mayúsculas. "carátula" y "Caratula" son CARATULA.
 */
export function variableKey(nombre: string): string {
  return flexibleKey(nombre).toLocaleUpperCase('es');
}

export interface Mark {
  /** Posición del primer "#" en el texto. */
  inicio: number;
  /** Posición siguiente al último "#". */
  fin: number;
  /** El nombre tal como se escribió. */
  nombre: string;
  clave: string;
}

/**
 * Las marcas de variable de un texto, de izquierda a derecha y sin superponerse (RF-7). Un "#"
 * que no forma una marca ("local # 3", "#123#", "#____#") es texto común.
 */
export function findMarks(texto: string): Mark[] {
  return [...texto.matchAll(mark())].map((match) => ({
    inicio: match.index,
    fin: match.index + match[0].length,
    nombre: match[1],
    clave: variableKey(match[1]),
  }));
}

/**
 * Reemplaza cada marca por lo que devuelve `replacement`, en una sola pasada: lo insertado no
 * se vuelve a examinar ni se interpreta como patrón (RF-33).
 */
export function replaceMarks(
  texto: string,
  replacement: (clave: string, marca: string) => string,
): string {
  return texto.replace(mark(), (marca: string, nombre: string) =>
    replacement(variableKey(nombre), marca),
  );
}

/**
 * El texto con sus marcas en la forma del catálogo (RF-8). Una marca que no existe queda como
 * se escribió: la rechaza unknownVariables.
 */
export function canonicalMarks(texto: string): string {
  return replaceMarks(texto, (clave, marca) => (isVariableName(clave) ? `#${clave}#` : marca));
}

/** RF-7: las marcas van separadas entre sí por al menos un espacio u otro carácter. */
export function hasJoinedMarks(texto: string): boolean {
  return JOINED_MARKS.test(texto);
}

const unique = <T>(items: T[]): T[] => [...new Set(items)];

/** Claves de las marcas que no están en el catálogo, sin repetir y en orden (RF-10). */
export function unknownVariables(texto: string): string[] {
  return unique(
    findMarks(texto)
      .map((found) => found.clave)
      .filter((clave) => !isVariableName(clave)),
  );
}

/** Variables del catálogo que usa el texto, sin repetir y en orden (RF-16). */
export function usedVariables(texto: string): VariableName[] {
  return unique(
    findMarks(texto)
      .map((found) => found.clave)
      .filter(isVariableName),
  );
}

/**
 * Inserta la marca de una variable en la posición del cursor, o en lugar del texto
 * seleccionado (RF-11). Devuelve el texto nuevo y dónde queda el cursor, después de la marca.
 */
export function insertVariable(
  texto: string,
  inicio: number,
  fin: number,
  nombre: VariableName,
): { texto: string; cursor: number } {
  const start = Math.min(Math.max(inicio, 0), texto.length);
  const end = Math.min(Math.max(fin, start), texto.length);
  const marca = `#${nombre}#`;
  return {
    texto: `${texto.slice(0, start)}${marca}${texto.slice(end)}`,
    cursor: start + marca.length,
  };
}
