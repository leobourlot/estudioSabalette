import type { Fuero } from './causas';
import { allowedCharactersMessage as singleLineCharactersMessage } from './formulario-causa';
import type {
  CreateModeloData,
  ListModelosQuery,
  ModeloDetalle,
  TipoEscrito,
  UpdateModeloData,
} from './modelos-escritos';
import {
  convertText,
  hasOnlySingleLineCharacters,
  hasOnlySumarioCharacters,
  textLength,
} from './texto-fallo';
import {
  ALLOWED_TEXT_SYMBOLS,
  canonicalMarks,
  convertModelText,
  findMarks,
  hasJoinedMarks,
  hasOnlyModelTextCharacters,
  isVariableName,
  MAX_DESCRIPCION_LENGTH,
  MAX_SEARCH_LENGTH,
  MAX_TEXTO_LENGTH,
  MAX_TITULO_LENGTH,
} from './texto-modelo';

/**
 * Formulario de un modelo de escrito y filtros del listado (spec 006): validación con los
 * mismos mensajes que la API (api/src/modelos-escritos/dto) y armado de los datos a enviar. La
 * API sigue siendo la fuente de verdad. No importa React (principio 3).
 */

/** Símbolos de la descripción (RF-4): los del título más ¿ ? ¡ ! %. */
const DESCRIPTION_SYMBOLS = '. , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! %';

export const MODELO_MESSAGES = {
  tituloRequired: 'Indicá el título del modelo',
  tituloTooLong: `El título no puede tener más de ${MAX_TITULO_LENGTH} caracteres`,
  tipoRequired: 'Indicá el tipo de escrito',
  descripcionTooLong: `La descripción no puede tener más de ${MAX_DESCRIPCION_LENGTH} caracteres`,
  descripcionCharacters: `La descripción solo puede tener letras, números, espacios y los símbolos ${DESCRIPTION_SYMBOLS}`,
  textoRequired: 'Indicá el texto del modelo',
  // "50.000", con el punto de miles, como lo fija la spec (RF-6).
  textoTooLong: 'El texto no puede tener más de 50.000 caracteres',
  textoCharacters: `El texto solo puede tener letras, números, espacios, saltos de línea y los símbolos ${ALLOWED_TEXT_SYMBOLS}`,
  joinedMarks: 'Las variables tienen que estar separadas',
  unknownVariables: 'El texto tiene variables que no existen',
  buscarCharacters: 'La búsqueda tiene caracteres no permitidos',
  buscarTooLong: `La búsqueda puede tener hasta ${MAX_SEARCH_LENGTH} caracteres`,
} as const;

const TITULO_LABEL = 'El título';

const singleLine = (value: string) => convertText(value, { multilinea: false });

const onlyProblems = (problems: (string | null)[]) =>
  problems.filter((problem): problem is string => problem !== null);

/** Largo del texto como lo cuenta la API: después de convertirlo (RF-3). */
export function convertedTextLength(texto: string): number {
  return textLength(convertModelText(texto));
}

/**
 * Las marcas del texto cuya variable no existe, tal como se escribieron y sin repetir: el
 * formulario las muestra debajo del mensaje, que no las nombra (RF-10).
 */
export function unknownMarks(texto: string): string[] {
  const marks = findMarks(convertModelText(texto))
    .filter((mark) => !isVariableName(mark.clave))
    .map((mark) => `#${mark.nombre}#`);
  return [...new Set(marks)];
}

function titleProblem(value: string): string | null {
  const text = singleLine(value);
  if (text === '') return MODELO_MESSAGES.tituloRequired;
  if (textLength(text) > MAX_TITULO_LENGTH) return MODELO_MESSAGES.tituloTooLong;
  return hasOnlySingleLineCharacters(text) ? null : singleLineCharactersMessage(TITULO_LABEL);
}

function descriptionProblem(value: string): string | null {
  const text = singleLine(value);
  if (text === '') return null;
  if (textLength(text) > MAX_DESCRIPCION_LENGTH) return MODELO_MESSAGES.descripcionTooLong;
  // Ya es de una sola línea: la regla de los movimientos no encuentra saltos de línea.
  return hasOnlySumarioCharacters(text) ? null : MODELO_MESSAGES.descripcionCharacters;
}

/** En el orden de la API: obligatorio, largo, caracteres, variables pegadas y variables que no existen. */
function textProblem(value: string): string | null {
  const text = convertModelText(value);
  if (text === '') return MODELO_MESSAGES.textoRequired;
  if (textLength(text) > MAX_TEXTO_LENGTH) return MODELO_MESSAGES.textoTooLong;
  if (!hasOnlyModelTextCharacters(text)) return MODELO_MESSAGES.textoCharacters;
  if (hasJoinedMarks(text)) return MODELO_MESSAGES.joinedMarks;
  return findMarks(text).every((mark) => isVariableName(mark.clave))
    ? null
    : MODELO_MESSAGES.unknownVariables;
}

// --- Modelo ---

export interface ModelForm {
  titulo: string;
  tipo: TipoEscrito | '';
  /** "otro" si el modelo no es de un fuero específico (RF-1). */
  fuero: Fuero;
  descripcion: string;
  texto: string;
}

export const EMPTY_MODEL_FORM: ModelForm = {
  titulo: '',
  tipo: '',
  fuero: 'otro',
  descripcion: '',
  texto: '',
};

/** Todos los problemas del formulario, en el orden de los campos; vacío si es válido. */
export function validateModelForm(form: ModelForm): string[] {
  return onlyProblems([
    titleProblem(form.titulo),
    form.tipo === '' ? MODELO_MESSAGES.tipoRequired : null,
    descriptionProblem(form.descripcion),
    textProblem(form.texto),
  ]);
}

/** Datos de la carga (RF-13), con los textos convertidos (RF-3) y las marcas en la forma del catálogo (RF-8). */
export function buildCreateModelData(form: ModelForm): CreateModeloData {
  return {
    titulo: singleLine(form.titulo),
    tipo: form.tipo as TipoEscrito,
    fuero: form.fuero,
    descripcion: singleLine(form.descripcion) || null,
    texto: canonicalMarks(convertModelText(form.texto)),
  };
}

export function modelFormFrom(modelo: ModeloDetalle): ModelForm {
  return {
    titulo: modelo.titulo,
    tipo: modelo.tipo,
    fuero: modelo.fuero,
    descripcion: modelo.descripcion ?? '',
    texto: modelo.texto,
  };
}

/** Solo lo que cambió (RF-14); la descripción vaciada se envía como null. Vacío si no cambió nada. */
export function buildUpdateModelData(form: ModelForm, modelo: ModeloDetalle): UpdateModeloData {
  const data = buildCreateModelData(form);
  const changes: UpdateModeloData = {};
  if (data.titulo !== modelo.titulo) changes.titulo = data.titulo;
  if (form.tipo !== '' && form.tipo !== modelo.tipo) changes.tipo = form.tipo;
  if (form.fuero !== modelo.fuero) changes.fuero = form.fuero;
  if (data.descripcion !== modelo.descripcion) changes.descripcion = data.descripcion;
  if (data.texto !== modelo.texto) changes.texto = data.texto;
  return changes;
}

// --- Filtros del listado (RF-21, RF-22) ---

export interface ModelFilters {
  buscar: string;
  tipo: TipoEscrito | '';
  fuero: Fuero | '';
  incluirDesactivados: boolean;
}

/** El listado abre sin ningún filtro elegido (RF-22, RF-29). */
export const EMPTY_MODEL_FILTERS: ModelFilters = {
  buscar: '',
  tipo: '',
  fuero: '',
  incluirDesactivados: false,
};

function searchProblem(value: string): string | null {
  const text = singleLine(value);
  if (text === '') return null;
  if (textLength(text) > MAX_SEARCH_LENGTH) return MODELO_MESSAGES.buscarTooLong;
  // Los caracteres del texto de un modelo, que incluyen @; ya no tiene saltos de línea.
  return hasOnlyModelTextCharacters(text) ? null : MODELO_MESSAGES.buscarCharacters;
}

/** Problemas de los filtros, con los mensajes de la API; vacío si son válidos (RF-21). */
export function validateModelFilters(filters: ModelFilters): string[] {
  return onlyProblems([searchProblem(filters.buscar)]);
}

/** Consulta del listado para una página: los filtros vacíos no se envían. */
export function toListQuery(filters: ModelFilters, pagina: number): ListModelosQuery {
  const query: ListModelosQuery = { pagina };
  const buscar = singleLine(filters.buscar);
  if (buscar !== '') query.buscar = buscar;
  if (filters.tipo !== '') query.tipo = filters.tipo;
  if (filters.fuero !== '') query.fuero = filters.fuero;
  if (filters.incluirDesactivados) query.incluirDesactivados = true;
  return query;
}
