import type {
  CreateMovimientoData,
  FiltroVisibilidad,
  ListMovimientosQuery,
  MovimientoDetalle,
  TipoMovimiento,
  UpdateMovimientoData,
} from './movimientos';

/**
 * Formulario de movimiento y filtros del historial (spec 003): validación con los mismos
 * mensajes que la API (api/src/movimientos/dto y api/src/movimientos/validadores) y armado de
 * los datos a enviar. La API sigue siendo la fuente de verdad. No importa React (principio 3).
 */

export const MAX_MOVEMENT_TEXT_LENGTH = 2000;
export const MIN_MOVEMENT_DATE = '1900-01-01';
export const MAX_MOVEMENT_DATE = '2099-12-31';
const MAX_SEARCH_LENGTH = 100;

export const MOVEMENT_MESSAGES = {
  fechaRequired: 'Indicá la fecha del movimiento',
  fechaInvalid: 'La fecha no es válida',
  fechaRange: 'La fecha debe estar entre el 01/01/1900 y el 31/12/2099',
  tipo: 'El tipo debe ser escrito presentado, providencia, resolución, sentencia, notificación, audiencia, pericia, oficio u otro',
  descripcionRequired: 'Indicá la descripción del movimiento',
  rangoInvertido: 'La fecha desde no puede ser posterior a la fecha hasta',
  buscar: `La búsqueda no puede tener más de ${MAX_SEARCH_LENGTH} caracteres`,
} as const;

const DESCRIPCION_LABEL = 'La descripción';
const TEXTO_CLIENTE_LABEL = 'El texto para el cliente';

const ALLOWED_SYMBOLS = '. , ; : / - _ ( ) " \' $ & # ° º ª ¿ ? ¡ ! %';
const ALLOWED_CHARACTERS = /^[\p{L}\p{N} \n.,;:/\-_()"'$&#°ºª¿?¡!%]*$/u;

/** Mensaje de RF-4 para un campo, por ejemplo "La descripción". */
export function allowedCharactersMessage(field: string): string {
  return `${field} solo puede tener letras, números, espacios, saltos de línea y los símbolos ${ALLOWED_SYMBOLS}`;
}

/**
 * Como la API (RF-3): une las tildes combinables, convierte \r\n y \r en \n y quita solo los
 * espacios y saltos de línea de los extremos.
 */
export function normalizeMovementText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/^[ \n]+|[ \n]+$/g, '');
}

/** Largo en caracteres (puntos de código), como lo cuentan la API y la base. */
export const textLength = (value: string) => [...value].length;

/** Fecha AAAA-MM-DD que existe en el calendario: rechaza el 31/02. */
export function isExistingDate(fecha: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  // setUTCFullYear y no Date.UTC, que interpreta los años 0 a 99 como 1900 a 1999.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function fechaProblem(fecha: string): string | null {
  if (fecha === '') return MOVEMENT_MESSAGES.fechaRequired;
  if (!isExistingDate(fecha)) return MOVEMENT_MESSAGES.fechaInvalid;
  return fecha >= MIN_MOVEMENT_DATE && fecha <= MAX_MOVEMENT_DATE
    ? null
    : MOVEMENT_MESSAGES.fechaRange;
}

function textProblem(value: string, label: string, required?: string): string | null {
  const text = normalizeMovementText(value);
  if (text === '') return required ?? null;
  if (textLength(text) > MAX_MOVEMENT_TEXT_LENGTH) {
    return `${label} no puede tener más de ${MAX_MOVEMENT_TEXT_LENGTH} caracteres`;
  }
  return ALLOWED_CHARACTERS.test(text) ? null : allowedCharactersMessage(label);
}

const onlyProblems = (problems: (string | null)[]) =>
  problems.filter((problem): problem is string => problem !== null);

// --- Movimiento ---

export interface MovementForm {
  /** AAAA-MM-DD, como lo da un input de tipo date. */
  fecha: string;
  tipo: TipoMovimiento | '';
  descripcion: string;
  textoCliente: string;
  visible: boolean;
}

/** Formulario vacío: nace no visible (RF-8). */
export const EMPTY_MOVEMENT_FORM: MovementForm = {
  fecha: '',
  tipo: '',
  descripcion: '',
  textoCliente: '',
  visible: false,
};

/** Todos los problemas del formulario, en el orden de los campos; vacío si es válido. */
export function validateMovementForm(form: MovementForm): string[] {
  return onlyProblems([
    fechaProblem(form.fecha),
    form.tipo === '' ? MOVEMENT_MESSAGES.tipo : null,
    textProblem(form.descripcion, DESCRIPCION_LABEL, MOVEMENT_MESSAGES.descripcionRequired),
    textProblem(form.textoCliente, TEXTO_CLIENTE_LABEL),
  ]);
}

/** Texto para el cliente para la API: normalizado, o null si quedó vacío (RF-3). */
const optionalText = (value: string) => {
  const text = normalizeMovementText(value);
  return text === '' ? null : text;
};

/** Datos de la carga (RF-8). */
export function buildCreateMovementData(form: MovementForm): CreateMovimientoData {
  return {
    fecha: form.fecha,
    tipo: form.tipo as TipoMovimiento,
    descripcion: normalizeMovementText(form.descripcion),
    textoCliente: optionalText(form.textoCliente),
    visible: form.visible,
  };
}

export function movementFormFrom(movimiento: MovimientoDetalle): MovementForm {
  return {
    fecha: movimiento.fecha,
    tipo: movimiento.tipo,
    descripcion: movimiento.descripcion,
    textoCliente: movimiento.textoCliente ?? '',
    visible: movimiento.visible,
  };
}

/** Solo lo que cambió (RF-11); el texto para el cliente vaciado se envía como null. */
export function buildUpdateMovementData(
  form: MovementForm,
  movimiento: MovimientoDetalle,
): UpdateMovimientoData {
  const changes: UpdateMovimientoData = {};
  if (form.fecha !== movimiento.fecha) changes.fecha = form.fecha;
  if (form.tipo !== '' && form.tipo !== movimiento.tipo) changes.tipo = form.tipo;
  const descripcion = normalizeMovementText(form.descripcion);
  if (descripcion !== movimiento.descripcion) changes.descripcion = descripcion;
  const textoCliente = optionalText(form.textoCliente);
  if (textoCliente !== movimiento.textoCliente) changes.textoCliente = textoCliente;
  if (form.visible !== movimiento.visible) changes.visible = form.visible;
  return changes;
}

// --- Filtros del historial ---

export interface MovementFilters {
  buscar: string;
  tipo: TipoMovimiento | '';
  visibilidad: FiltroVisibilidad;
  desde: string;
  hasta: string;
  ocultarAnulados: boolean;
}

export const EMPTY_MOVEMENT_FILTERS: MovementFilters = {
  buscar: '',
  tipo: '',
  visibilidad: 'todos',
  desde: '',
  hasta: '',
  ocultarAnulados: false,
};

/** Problemas de los filtros, con los mensajes de la API; vacío si son válidos (RF-26). */
export function validateMovementFilters(filters: MovementFilters): string[] {
  return onlyProblems([
    textLength(filters.buscar.trim()) > MAX_SEARCH_LENGTH ? MOVEMENT_MESSAGES.buscar : null,
    filters.desde !== '' && filters.hasta !== '' && filters.desde > filters.hasta
      ? MOVEMENT_MESSAGES.rangoInvertido
      : null,
  ]);
}

/** Consulta del historial para una página: los filtros vacíos no se envían. */
export function toListQuery(filters: MovementFilters, pagina: number): ListMovimientosQuery {
  return {
    pagina,
    buscar: filters.buscar,
    tipo: filters.tipo === '' ? undefined : filters.tipo,
    visibilidad: filters.visibilidad,
    desde: filters.desde,
    hasta: filters.hasta,
    ocultarAnulados: filters.ocultarAnulados,
  };
}

// --- Avisos de visibilidad (RF-9, RF-13): informativos, no bloquean ni piden confirmación ---

export const VISIBLE_CHANGE_WARNING =
  'Este movimiento es visible para el cliente; el cambio se verá en el portal';

export const VISIBLE_TEXT_ORIGIN_LABELS = {
  textoCliente: 'texto para el cliente',
  descripcion: 'descripción (no hay texto para el cliente)',
} as const;

/**
 * Lo que leerá el cliente si el movimiento es visible (RF-7, RF-9): el texto para el cliente
 * o, si quedó vacío, la descripción, con su origen. Se calcula mientras se escribe.
 */
export function visibleTextPreview(form: Pick<MovementForm, 'descripcion' | 'textoCliente'>): {
  texto: string;
  origen: keyof typeof VISIBLE_TEXT_ORIGIN_LABELS;
} {
  const textoCliente = optionalText(form.textoCliente);
  return textoCliente === null
    ? { texto: normalizeMovementText(form.descripcion), origen: 'descripcion' }
    : { texto: textoCliente, origen: 'textoCliente' };
}

/**
 * RF-13: el movimiento ya era visible, sigue siéndolo, y cambia algo de lo que ve el cliente
 * (fecha, tipo, descripción o texto para el cliente).
 */
export function needsVisibleChangeWarning(
  movimiento: MovimientoDetalle,
  form: MovementForm,
): boolean {
  if (!movimiento.visible || !form.visible) return false;
  const changes = buildUpdateMovementData(form, movimiento);
  return Object.keys(changes).some((campo) => campo !== 'visible');
}
