import type {
  CausaDetalle,
  CreateCausaData,
  EstadoCausa,
  Fuero,
  LawyersData,
  NewPartyData,
  ParteDetalle,
  RolProcesal,
  UpdateCausaData,
} from './causas';
import type { TipoPersona } from './sesion';
import {
  fitsMaxLength,
  isBlank,
  MAX_TEXT_LENGTH,
  normalizeDocumentNumber,
  validateCuit,
  validateDni,
} from './validaciones';

/**
 * Formularios de causa y de parte (spec 002): validación con los mismos mensajes que la API
 * (api/src/causas/dto y api/src/causas/validadores) y armado de los datos a enviar. La API
 * sigue siendo la fuente de verdad. No importa React (principio 3).
 */

const MAX_CARATULA_LENGTH = 255;
const MAX_CASE_NUMBER_LENGTH = 50;
const MAX_COURT_LENGTH = 150;

const ALLOWED_SYMBOLS = '. , ; : / - _ ( ) " \' $ & # ° º ª';
const ALLOWED_CHARACTERS = /^[\p{L}\p{N} .,;:/\-_()"'$&#°ºª]*$/u;

/** Mensaje de RF-4 para un campo, por ejemplo "La carátula". */
export function allowedCharactersMessage(field: string): string {
  return `${field} solo puede tener letras, números, espacios y los símbolos ${ALLOWED_SYMBOLS}`;
}

/** Recorta y une cada letra con su tilde combinable (RF-3, RF-4), como la API. */
const clean = (value: string) => value.trim().normalize('NFC');

/** Texto de la causa: obligatorio si se indica required, largo máximo y caracteres (RF-4, RF-5). */
function causaTextProblem(
  value: string,
  label: string,
  max: number,
  required?: string,
): string | null {
  const text = clean(value);
  if (text === '') return required ?? null;
  if (!fitsMaxLength(text, max)) return `${label} no puede tener más de ${max} caracteres`;
  return ALLOWED_CHARACTERS.test(text) ? null : allowedCharactersMessage(label);
}

const onlyProblems = (problems: (string | null)[]) =>
  problems.filter((problem): problem is string => problem !== null);

// --- Causa ---

export interface CausaForm {
  caratula: string;
  numeroExpediente: string;
  juzgado: string;
  fuero: Fuero | '';
  estado: EstadoCausa;
  esIncidente: boolean;
  expedientePrincipal: string;
}

export const EMPTY_CAUSA_FORM: CausaForm = {
  caratula: '',
  numeroExpediente: '',
  juzgado: '',
  fuero: '',
  estado: 'en_tramite',
  esIncidente: false,
  expedientePrincipal: '',
};

/** Todos los problemas del formulario, en el orden de los campos; vacío si es válido. */
export function validateCausaForm(form: CausaForm): string[] {
  return onlyProblems([
    causaTextProblem(
      form.caratula,
      'La carátula',
      MAX_CARATULA_LENGTH,
      'La carátula es obligatoria',
    ),
    causaTextProblem(form.numeroExpediente, 'El número de expediente', MAX_CASE_NUMBER_LENGTH),
    causaTextProblem(form.juzgado, 'El juzgado', MAX_COURT_LENGTH),
    form.fuero === '' ? 'El fuero debe ser civil, penal, familia, laboral, federal u otro' : null,
    form.esIncidente
      ? causaTextProblem(
          form.expedientePrincipal,
          'El número del expediente principal',
          MAX_CASE_NUMBER_LENGTH,
          'Indicá el número del expediente principal',
        )
      : null,
  ]);
}

/** Texto opcional para la API: recortado, o null si quedó vacío. */
const optional = (value: string) => (clean(value) === '' ? null : clean(value));

/** Datos del alta (RF-6): los opcionales vacíos no se envían. */
export function buildCreateCausaData(
  form: CausaForm,
  lawyers: LawyersData,
  partes: NewPartyData[],
): CreateCausaData {
  const data: CreateCausaData = {
    caratula: clean(form.caratula),
    fuero: form.fuero as Fuero,
    estado: form.estado,
    esIncidente: form.esIncidente,
    responsableId: lawyers.responsableId,
    colaboradorIds: lawyers.colaboradorIds,
    partes,
  };
  const numeroExpediente = optional(form.numeroExpediente);
  const juzgado = optional(form.juzgado);
  if (numeroExpediente !== null) data.numeroExpediente = numeroExpediente;
  if (juzgado !== null) data.juzgado = juzgado;
  if (form.esIncidente) data.expedientePrincipal = clean(form.expedientePrincipal);
  return data;
}

export function causaFormFrom(causa: CausaDetalle): CausaForm {
  return {
    caratula: causa.caratula,
    numeroExpediente: causa.numeroExpediente ?? '',
    juzgado: causa.juzgado ?? '',
    fuero: causa.fuero,
    estado: causa.estado,
    esIncidente: causa.esIncidente,
    expedientePrincipal: causa.expedientePrincipal ?? '',
  };
}

/**
 * Solo lo que cambió (RF-11); un opcional vaciado se envía como null. Al quitar la marca de
 * incidente alcanza con enviar la marca: la API borra el expediente principal.
 */
export function buildUpdateCausaData(form: CausaForm, causa: CausaDetalle): UpdateCausaData {
  const changes: UpdateCausaData = {};
  if (clean(form.caratula) !== causa.caratula) changes.caratula = clean(form.caratula);
  if (optional(form.numeroExpediente) !== causa.numeroExpediente) {
    changes.numeroExpediente = optional(form.numeroExpediente);
  }
  if (optional(form.juzgado) !== causa.juzgado) changes.juzgado = optional(form.juzgado);
  if (form.fuero !== '' && form.fuero !== causa.fuero) changes.fuero = form.fuero;
  if (form.estado !== causa.estado) changes.estado = form.estado;
  if (form.esIncidente !== causa.esIncidente) changes.esIncidente = form.esIncidente;
  if (form.esIncidente && optional(form.expedientePrincipal) !== causa.expedientePrincipal) {
    changes.expedientePrincipal = optional(form.expedientePrincipal);
  }
  return changes;
}

// --- Parte ---

export interface PartyForm {
  modo: 'cliente' | 'noCliente';
  rol: RolProcesal;
  clienteId: number | null;
  tipoPersona: TipoPersona;
  nombre: string;
  apellido: string;
  razonSocial: string;
  dni: string;
  cuit: string;
}

export const EMPTY_PARTY_FORM: PartyForm = {
  modo: 'cliente',
  rol: 'actor',
  clienteId: null,
  tipoPersona: 'fisica',
  nombre: '',
  apellido: '',
  razonSocial: '',
  dni: '',
  cuit: '',
};

function requiredName(value: string, label: string, required: string): string | null {
  if (isBlank(value)) return required;
  return fitsMaxLength(value.trim(), MAX_TEXT_LENGTH)
    ? null
    : `${label} no puede tener más de ${MAX_TEXT_LENGTH} caracteres`;
}

/** Problemas de la parte (RF-15): cliente elegido, o datos según el tipo de persona. */
export function validatePartyForm(form: PartyForm): string[] {
  if (form.modo === 'cliente') return form.clienteId === null ? ['Elegí el cliente'] : [];
  if (form.tipoPersona === 'fisica') {
    return onlyProblems([
      requiredName(form.nombre, 'El nombre', 'El nombre es obligatorio'),
      requiredName(form.apellido, 'El apellido', 'El apellido es obligatorio'),
      isBlank(form.dni) ? null : validateDni(form.dni),
    ]);
  }
  return onlyProblems([
    requiredName(
      form.razonSocial,
      'La razón social',
      'La razón social es obligatoria para personas jurídicas',
    ),
    isBlank(form.cuit) ? null : validateCuit(form.cuit),
  ]);
}

/** Datos de la parte para la API: solo los campos de su forma (RF-14, RF-15). */
export function buildPartyData(form: PartyForm): NewPartyData {
  if (form.modo === 'cliente') return { rol: form.rol, clienteId: form.clienteId! };
  if (form.tipoPersona === 'fisica') {
    return {
      rol: form.rol,
      tipoPersona: 'fisica',
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      ...(isBlank(form.dni) ? {} : { dni: normalizeDocumentNumber(form.dni) }),
    };
  }
  return {
    rol: form.rol,
    tipoPersona: 'juridica',
    razonSocial: form.razonSocial.trim(),
    ...(isBlank(form.cuit) ? {} : { cuit: normalizeDocumentNumber(form.cuit) }),
  };
}

export function partyFormFrom(parte: ParteDetalle): PartyForm {
  return {
    modo: parte.esCliente ? 'cliente' : 'noCliente',
    rol: parte.rol,
    clienteId: parte.clienteId,
    tipoPersona: parte.tipoPersona,
    nombre: parte.nombre ?? '',
    apellido: parte.apellido ?? '',
    razonSocial: parte.razonSocial ?? '',
    dni: parte.dni ?? '',
    cuit: parte.cuit ?? '',
  };
}
