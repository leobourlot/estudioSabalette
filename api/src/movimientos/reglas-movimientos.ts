/**
 * Reglas de los movimientos que no necesitan la base (plan 003, "Reglas de negocio"). Los
 * services las consultan.
 */

/** Datos de un movimiento que se registran en el historial de cambios (RF-20). */
export interface MovementData {
  /** AAAA-MM-DD. */
  fecha: string;
  tipo: string;
  descripcion: string;
  textoCliente: string | null;
  visible: boolean;
  anulado: boolean;
}

export const MOVEMENT_FIELDS = [
  'fecha',
  'tipo',
  'descripcion',
  'textoCliente',
  'visible',
  'anulado',
] as const satisfies readonly (keyof MovementData)[];

export type CampoMovimiento = (typeof MOVEMENT_FIELDS)[number];

export type ValorCampo = string | boolean | null;

/** Un dato que cambió: su valor anterior y el nuevo (RF-20). */
export interface CambioCampo {
  campo: CampoMovimiento;
  anterior: ValorCampo;
  nuevo: ValorCampo;
}

export type OrigenTextoVisible = 'textoCliente' | 'descripcion';

/** Texto visible para el cliente (RF-7): el texto para el cliente o, si no hay, la descripción. */
export function visibleText(movimiento: Pick<MovementData, 'descripcion' | 'textoCliente'>): {
  texto: string;
  origen: OrigenTextoVisible;
} {
  return movimiento.textoCliente === null
    ? { texto: movimiento.descripcion, origen: 'descripcion' }
    : { texto: movimiento.textoCliente, origen: 'textoCliente' };
}

/** Los datos que cambiaron entre dos versiones, en el orden de MOVEMENT_FIELDS (RF-20). */
export function diffMovement(antes: MovementData, despues: MovementData): CambioCampo[] {
  return MOVEMENT_FIELDS.filter((campo) => antes[campo] !== despues[campo]).map((campo) => ({
    campo,
    anterior: antes[campo],
    nuevo: despues[campo],
  }));
}

/** Cambios de la carga: todos los datos, con anterior en null (RF-20). */
export function loadChanges(movimiento: MovementData): CambioCampo[] {
  return MOVEMENT_FIELDS.map((campo) => ({ campo, anterior: null, nuevo: movimiento[campo] }));
}

export const MIN_MOVEMENT_DATE = '1900-01-01';
export const MAX_MOVEMENT_DATE = '2099-12-31';

/** Fecha con formato AAAA-MM-DD que existe en el calendario (RF-6): rechaza el 31/02. */
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

/**
 * Rango de RF-5, del 01/01/1900 al 31/12/2099. Con el formato AAAA-MM-DD, comparar el texto
 * equivale a comparar las fechas.
 */
export function isDateInRange(fecha: string): boolean {
  return fecha >= MIN_MOVEMENT_DATE && fecha <= MAX_MOVEMENT_DATE;
}

const BUENOS_AIRES_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Día actual en Buenos Aires, como AAAA-MM-DD (RNF de fechas). */
export function todayInBuenosAires(ahora: Date = new Date()): string {
  const parts = Object.fromEntries(
    BUENOS_AIRES_DATE.formatToParts(ahora).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Si la fecha del movimiento es posterior al día actual en Buenos Aires (RF-24). */
export function isFutureDate(fecha: string, ahora: Date = new Date()): boolean {
  return fecha > todayInBuenosAires(ahora);
}
