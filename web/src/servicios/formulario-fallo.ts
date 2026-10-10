import type { Fuero } from './causas';
import { allowedCharactersMessage as singleLineCharactersMessage } from './formulario-causa';
import {
  isExistingDate,
  allowedCharactersMessage as sumarioCharactersMessage,
} from './formulario-movimiento';
import type {
  CreateFalloData,
  FalloDetalle,
  ListFallosQuery,
  PalabraClave,
  PalabraClaveSugerencia,
  UpdateFalloData,
} from './jurisprudencia';
import {
  convertText,
  flexibleKey,
  hasOnlySingleLineCharacters,
  hasOnlySumarioCharacters,
  linkViolation,
  MAX_CARATULA_LENGTH,
  MAX_KEYWORD_LENGTH,
  MAX_KEYWORDS,
  MAX_LINK_LENGTH,
  MAX_NUMERO_LENGTH,
  MAX_SEARCH_LENGTH,
  MAX_SUMARIO_LENGTH,
  MAX_TRIBUNAL_LENGTH,
  textLength,
} from './texto-fallo';

/**
 * Formulario de un fallo y filtros del listado (spec 005): validación con los mismos mensajes
 * que la API (api/src/jurisprudencia/dto) y armado de los datos a enviar. La API sigue siendo
 * la fuente de verdad. No importa React (principio 3).
 */

/** Fecha mínima de un fallo (RF-7). */
export const MIN_FALLO_DATE = '1800-01-01';

export const FALLO_MESSAGES = {
  caratulaRequired: 'La carátula es obligatoria',
  tribunalRequired: 'Indicá el tribunal',
  fuero: 'El fuero debe ser civil, penal, familia, laboral, federal u otro',
  fechaRequired: 'Indicá la fecha del fallo',
  fechaInvalid: 'La fecha no es válida',
  fechaBeforeMin: 'La fecha no puede ser anterior al 01/01/1800',
  fechaFuture: 'La fecha del fallo no puede ser posterior a hoy',
  sumarioRequired: 'Indicá el sumario del fallo',
  sumarioTooLong: `El sumario no puede tener más de ${MAX_SUMARIO_LENGTH} caracteres`,
  keywordsRequired: 'Indicá al menos una palabra clave',
  keywordsMax: `Un fallo puede tener hasta ${MAX_KEYWORDS} palabras clave`,
  keywordEmpty: 'La palabra clave no puede quedar vacía',
  keywordTooLong: `Cada palabra clave puede tener hasta ${MAX_KEYWORD_LENGTH} caracteres`,
  linkScheme: 'El enlace debe empezar con https://',
  linkFormat: 'El enlace tiene un formato o caracteres no permitidos',
  linkTooLong: `El enlace no puede tener más de ${MAX_LINK_LENGTH} caracteres`,
  buscarCharacters: 'La búsqueda tiene caracteres no permitidos',
  buscarTooLong: `La búsqueda puede tener hasta ${MAX_SEARCH_LENGTH} caracteres`,
  rangoInvertido: 'La fecha desde no puede ser posterior a la fecha hasta',
} as const;

const CARATULA_LABEL = 'La carátula';
const TRIBUNAL_LABEL = 'El tribunal';
const NUMERO_LABEL = 'El número';
const SUMARIO_LABEL = 'El sumario';
const KEYWORD_LABEL = 'La palabra clave';

const singleLine = (value: string) => convertText(value, { multilinea: false });
const multiline = (value: string) => convertText(value, { multilinea: true });

const onlyProblems = (problems: (string | null)[]) =>
  problems.filter((problem): problem is string => problem !== null);

/** Día actual en Buenos Aires como AAAA-MM-DD: el máximo de la fecha de un fallo (RF-7). */
export function todayInBuenosAires(ahora: Date = new Date()): string {
  // El formato en-CA es AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

/** Largo del sumario como lo cuenta la API: después de convertirlo (RF-3). */
export function convertedSumarioLength(sumario: string): number {
  return textLength(multiline(sumario));
}

/** Carátula, tribunal y número: obligatorio si se indica required, largo y caracteres (RF-4). */
function singleLineProblem(
  value: string,
  label: string,
  max: number,
  required?: string,
): string | null {
  const text = singleLine(value);
  if (text === '') return required ?? null;
  if (textLength(text) > max) return `${label} no puede tener más de ${max} caracteres`;
  return hasOnlySingleLineCharacters(text) ? null : singleLineCharactersMessage(label);
}

/** Fecha existente y en el rango de RF-7; `required` es el mensaje si falta. */
function dateProblem(fecha: string, ahora: Date, required: string | null): string | null {
  if (fecha === '') return required;
  if (!isExistingDate(fecha)) return FALLO_MESSAGES.fechaInvalid;
  if (fecha < MIN_FALLO_DATE) return FALLO_MESSAGES.fechaBeforeMin;
  return fecha > todayInBuenosAires(ahora) ? FALLO_MESSAGES.fechaFuture : null;
}

function sumarioProblem(value: string): string | null {
  const text = multiline(value);
  if (text === '') return FALLO_MESSAGES.sumarioRequired;
  if (textLength(text) > MAX_SUMARIO_LENGTH) return FALLO_MESSAGES.sumarioTooLong;
  return hasOnlySumarioCharacters(text) ? null : sumarioCharactersMessage(SUMARIO_LABEL);
}

function keywordsProblem(palabras: readonly string[]): string | null {
  const keywords = cleanKeywords(palabras);
  if (palabras.length === 0) return FALLO_MESSAGES.keywordsRequired;
  if (palabras.some((palabra) => singleLine(palabra) === '')) return FALLO_MESSAGES.keywordEmpty;
  if (keywords.length > MAX_KEYWORDS) return FALLO_MESSAGES.keywordsMax;
  if (keywords.some((palabra) => textLength(palabra) > MAX_KEYWORD_LENGTH)) {
    return FALLO_MESSAGES.keywordTooLong;
  }
  return keywords.every(hasOnlySingleLineCharacters)
    ? null
    : singleLineCharactersMessage(KEYWORD_LABEL);
}

function linkProblem(value: string): string | null {
  const enlace = value.trim();
  if (enlace === '') return null;
  if (textLength(enlace) > MAX_LINK_LENGTH) return FALLO_MESSAGES.linkTooLong;
  const violation = linkViolation(enlace);
  if (violation === 'esquema') return FALLO_MESSAGES.linkScheme;
  return violation === 'formato' ? FALLO_MESSAGES.linkFormat : null;
}

// --- Palabras clave del formulario (RF-14) ---

/** Las palabras convertidas, sin vacías ni repetidas por comparación flexible. */
function cleanKeywords(palabras: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const palabra of palabras) {
    const texto = singleLine(palabra);
    const key = flexibleKey(texto);
    if (texto === '' || seen.has(key)) continue;
    seen.add(key);
    result.push(texto);
  }
  return result;
}

/**
 * Agrega una palabra clave a la lista del formulario. No agrega una vacía ni una igual, por
 * comparación flexible, a otra que ya está: en ese caso devuelve la misma lista.
 */
export function addKeyword(palabras: readonly string[], texto: string): string[] {
  const nueva = singleLine(texto);
  if (nueva === '') return [...palabras];
  const key = flexibleKey(nueva);
  return palabras.some((palabra) => flexibleKey(palabra) === key)
    ? [...palabras]
    : [...palabras, nueva];
}

export function removeKeyword(palabras: readonly string[], texto: string): string[] {
  const key = flexibleKey(texto);
  return palabras.filter((palabra) => flexibleKey(palabra) !== key);
}

/** Mínimo de caracteres escritos para pedir sugerencias (RF-13). */
export const MIN_SUGGESTION_LENGTH = 2;

/** Espera sin escribir antes de pedir sugerencias, para no consultar en cada tecla. */
export const SUGGESTION_DELAY_MS = 300;

/**
 * Texto con el que se piden sugerencias, ya convertido, o null si todavía no corresponde
 * pedirlas: menos de 2 caracteres, más de 50 o caracteres que una palabra clave no admite
 * (la API los rechazaría).
 */
export function keywordSearchText(texto: string): string | null {
  const text = singleLine(texto);
  const length = textLength(text);
  if (length < MIN_SUGGESTION_LENGTH || length > MAX_KEYWORD_LENGTH) return null;
  return hasOnlySingleLineCharacters(text) ? text : null;
}

/** Las sugerencias que todavía no están elegidas, por comparación flexible. */
export function withoutChosen(
  sugerencias: readonly PalabraClaveSugerencia[],
  elegidas: readonly string[],
): PalabraClaveSugerencia[] {
  const chosen = new Set(elegidas.map(flexibleKey));
  return sugerencias.filter((sugerencia) => !chosen.has(flexibleKey(sugerencia.texto)));
}

// --- Fallo ---

export interface RulingForm {
  caratula: string;
  tribunal: string;
  fuero: Fuero | '';
  /** AAAA-MM-DD, como lo da un input de tipo date. */
  fecha: string;
  numero: string;
  sumario: string;
  palabrasClave: string[];
  enlace: string;
}

export const EMPTY_RULING_FORM: RulingForm = {
  caratula: '',
  tribunal: '',
  fuero: '',
  fecha: '',
  numero: '',
  sumario: '',
  palabrasClave: [],
  enlace: '',
};

/** Todos los problemas del formulario, en el orden de los campos; vacío si es válido. */
export function validateRulingForm(form: RulingForm, ahora: Date = new Date()): string[] {
  return onlyProblems([
    singleLineProblem(
      form.caratula,
      CARATULA_LABEL,
      MAX_CARATULA_LENGTH,
      FALLO_MESSAGES.caratulaRequired,
    ),
    singleLineProblem(
      form.tribunal,
      TRIBUNAL_LABEL,
      MAX_TRIBUNAL_LENGTH,
      FALLO_MESSAGES.tribunalRequired,
    ),
    form.fuero === '' ? FALLO_MESSAGES.fuero : null,
    dateProblem(form.fecha, ahora, FALLO_MESSAGES.fechaRequired),
    singleLineProblem(form.numero, NUMERO_LABEL, MAX_NUMERO_LENGTH),
    sumarioProblem(form.sumario),
    keywordsProblem(form.palabrasClave),
    linkProblem(form.enlace),
  ]);
}

/** Número y enlace para la API: null si quedaron vacíos. */
const optionalNumber = (value: string) => singleLine(value) || null;
const optionalLink = (value: string) => value.trim() || null;

/** Datos de la carga (RF-16), con los textos ya convertidos (RF-3). */
export function buildCreateRulingData(form: RulingForm): CreateFalloData {
  return {
    caratula: singleLine(form.caratula),
    tribunal: singleLine(form.tribunal),
    fuero: form.fuero as Fuero,
    fecha: form.fecha,
    numero: optionalNumber(form.numero),
    sumario: multiline(form.sumario),
    palabrasClave: cleanKeywords(form.palabrasClave),
    enlace: optionalLink(form.enlace),
  };
}

export function rulingFormFrom(fallo: FalloDetalle): RulingForm {
  return {
    caratula: fallo.caratula,
    tribunal: fallo.tribunal,
    fuero: fallo.fuero,
    fecha: fallo.fecha,
    numero: fallo.numero ?? '',
    sumario: fallo.sumario,
    palabrasClave: fallo.palabrasClave.map((palabra) => palabra.texto),
    enlace: fallo.enlace ?? '',
  };
}

/** Las dos listas tienen los mismos textos, sin importar el orden. */
function sameTexts(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = [...b].sort();
  return [...a].sort().every((texto, index) => texto === sorted[index]);
}

/**
 * Solo lo que cambió (RF-17); el número y el enlace vaciados se envían como null. Las
 * palabras clave se envían si cambió la lista o la forma de alguna (RF-12).
 */
export function buildUpdateRulingData(form: RulingForm, fallo: FalloDetalle): UpdateFalloData {
  const data = buildCreateRulingData(form);
  const changes: UpdateFalloData = {};
  if (data.caratula !== fallo.caratula) changes.caratula = data.caratula;
  if (data.tribunal !== fallo.tribunal) changes.tribunal = data.tribunal;
  if (form.fuero !== '' && form.fuero !== fallo.fuero) changes.fuero = form.fuero;
  if (data.fecha !== fallo.fecha) changes.fecha = data.fecha;
  if (data.numero !== fallo.numero) changes.numero = data.numero;
  if (data.sumario !== fallo.sumario) changes.sumario = data.sumario;
  const actuales = fallo.palabrasClave.map((palabra) => palabra.texto);
  if (!sameTexts(data.palabrasClave, actuales)) changes.palabrasClave = data.palabrasClave;
  if (data.enlace !== fallo.enlace) changes.enlace = data.enlace;
  return changes;
}

// --- Filtros del listado (RF-24 a RF-26) ---

export interface RulingFilters {
  buscar: string;
  /** Palabras del catálogo elegidas: el filtro envía sus ids. */
  palabrasClave: PalabraClave[];
  fuero: Fuero | '';
  desde: string;
  hasta: string;
  incluirDesactivados: boolean;
}

export const EMPTY_RULING_FILTERS: RulingFilters = {
  buscar: '',
  palabrasClave: [],
  fuero: '',
  desde: '',
  hasta: '',
  incluirDesactivados: false,
};

function searchProblem(value: string): string | null {
  const text = singleLine(value);
  if (text === '') return null;
  if (textLength(text) > MAX_SEARCH_LENGTH) return FALLO_MESSAGES.buscarTooLong;
  return hasOnlySumarioCharacters(text) ? null : FALLO_MESSAGES.buscarCharacters;
}

/** Problemas de los filtros, con los mensajes de la API; vacío si son válidos (RF-24, RF-26). */
export function validateRulingFilters(filters: RulingFilters, ahora: Date = new Date()): string[] {
  const desde = dateProblem(filters.desde, ahora, null);
  const hasta = dateProblem(filters.hasta, ahora, null);
  const bothValid =
    filters.desde !== '' && filters.hasta !== '' && desde === null && hasta === null;
  return onlyProblems([
    searchProblem(filters.buscar),
    desde,
    hasta,
    bothValid && filters.desde > filters.hasta ? FALLO_MESSAGES.rangoInvertido : null,
  ]);
}

/** Consulta del listado para una página: los filtros vacíos no se envían. */
export function toListQuery(filters: RulingFilters, pagina: number): ListFallosQuery {
  return {
    pagina,
    buscar: singleLine(filters.buscar) || undefined,
    palabrasClave:
      filters.palabrasClave.length > 0
        ? filters.palabrasClave.map((palabra) => palabra.id)
        : undefined,
    fuero: filters.fuero === '' ? undefined : filters.fuero,
    desde: filters.desde || undefined,
    hasta: filters.hasta || undefined,
    incluirDesactivados: filters.incluirDesactivados || undefined,
  };
}
