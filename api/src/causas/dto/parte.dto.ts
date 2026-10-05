import { plainToInstance, Transform } from 'class-transformer';
import { validate } from 'class-validator';
import { formatValidationErrors } from '../../configuracion/errores-de-validacion.js';
import {
  optional,
  personTypeRule,
  Rule,
  type RuleFn,
  toDocumentNumber,
  trimText,
} from '../../usuarios/dto/reglas.js';
import { PERSON_TYPES, type TipoPersona } from '../../usuarios/cliente.entity.js';
import { isValidCuit, isValidDni } from '../../usuarios/validadores/documentos.js';
import { fitsMaxLength, MAX_TEXT_LENGTH } from '../../usuarios/validadores/longitudes.js';
import { PROCEDURAL_ROLES, type RolProcesal } from '../parte.entity.js';
import { booleanRule, CAUSA_MESSAGES, enumRule, idRule } from './reglas-causa.js';

export const PARTE_MESSAGES = {
  rol: 'El rol procesal debe ser actor, demandado, tercero u otro',
  clienteId: 'El cliente debe ser el id de un cliente del estudio',
  clientOwnData: 'Una parte cliente no lleva datos propios: se toman de su cuenta',
  tipoPersonaRequired: 'Indicá el tipo de persona de la parte',
} as const;

const OWN_DATA_FIELDS = ['nombre', 'apellido', 'razonSocial', 'dni', 'cuit'] as const;

const isPresent = (value: unknown) => value !== undefined && value !== null && value !== '';
const isClientParty = (object: Record<string, unknown>) => isPresent(object.clienteId);
const hasOwnData = (object: Record<string, unknown>) =>
  OWN_DATA_FIELDS.some((field) => isPresent(object[field]));

/** DNI o CUIT opcional: normalizado (RF-15) y, si queda vacío, no informado. */
const toOptionalDocument = (params: Parameters<typeof toDocumentNumber>[0]): unknown => {
  const value = toDocumentNumber(params);
  return value === '' ? null : value;
};

/**
 * Dato propio de una parte no cliente, según su tipo de persona (RF-15). Una parte cliente
 * no lleva datos propios: se toman de su cuenta (RF-14). Si el tipo de persona falta o no es
 * válido, lo informa la regla de tipoPersona y acá no se repite.
 */
const ownData =
  (
    personType: TipoPersona,
    messages: { required?: string; forbidden: string },
    format: (value: unknown) => string | null,
  ): RuleFn =>
  (value, object) => {
    const present = isPresent(value);
    if (isClientParty(object)) return present ? PARTE_MESSAGES.clientOwnData : null;
    if (!(PERSON_TYPES as readonly unknown[]).includes(object.tipoPersona)) return null;
    if (object.tipoPersona !== personType) return present ? messages.forbidden : null;
    if (!present) return messages.required ?? null;
    return format(value);
  };

const maxText = (label: string) => (value: unknown) =>
  fitsMaxLength(String(value), MAX_TEXT_LENGTH)
    ? null
    : `${label} no puede tener más de ${MAX_TEXT_LENGTH} caracteres`;

/** Tipo de persona: prohibido en una parte cliente; si no, missing decide qué pasa si falta. */
const personType =
  (missing: (object: Record<string, unknown>) => string | null): RuleFn =>
  (value, object) => {
    if (isClientParty(object)) return isPresent(value) ? PARTE_MESSAGES.clientOwnData : null;
    if (value === undefined || value === null) return missing(object);
    return personTypeRule(value, object);
  };

/**
 * Datos comunes a agregar y modificar una parte. Una parte cliente se indica con clienteId;
 * una no cliente, con su tipo de persona y sus datos propios. Que el cliente exista, esté
 * activo y no sea ya parte de la causa lo controla el service (RF-17, RF-18).
 */
abstract class ParteDataDto {
  @Rule(enumRule(PROCEDURAL_ROLES, PARTE_MESSAGES.rol))
  rol: RolProcesal;

  @Rule(optional(idRule(PARTE_MESSAGES.clienteId)))
  clienteId?: number;

  @Transform(trimText)
  @Rule(
    ownData(
      'fisica',
      {
        required: 'El nombre es obligatorio',
        forbidden: 'El nombre solo corresponde a personas físicas',
      },
      maxText('El nombre'),
    ),
  )
  nombre?: string;

  @Transform(trimText)
  @Rule(
    ownData(
      'fisica',
      {
        required: 'El apellido es obligatorio',
        forbidden: 'El apellido solo corresponde a personas físicas',
      },
      maxText('El apellido'),
    ),
  )
  apellido?: string;

  @Transform(trimText)
  @Rule(
    ownData(
      'juridica',
      {
        required: 'La razón social es obligatoria para personas jurídicas',
        forbidden: 'La razón social solo corresponde a personas jurídicas',
      },
      maxText('La razón social'),
    ),
  )
  razonSocial?: string;

  @Transform(toOptionalDocument)
  @Rule(
    ownData('fisica', { forbidden: 'El DNI solo corresponde a personas físicas' }, (value) =>
      isValidDni(String(value)) ? null : 'El DNI debe tener 7 u 8 dígitos',
    ),
  )
  dni?: string | null;

  @Transform(toOptionalDocument)
  @Rule(
    ownData('juridica', { forbidden: 'El CUIT solo corresponde a personas jurídicas' }, (value) =>
      isValidCuit(String(value))
        ? null
        : 'El CUIT debe tener 11 dígitos y un dígito verificador válido',
    ),
  )
  cuit?: string | null;

  // Respuestas a las preguntas de RF-16 y RF-19.
  @Rule(optional(booleanRule(CAUSA_MESSAGES.confirmation)))
  confirmarDocumentoDeCliente?: boolean;

  @Rule(optional(booleanRule(CAUSA_MESSAGES.confirmation)))
  confirmarNombreRepetido?: boolean;

  @Rule(optional(booleanRule(CAUSA_MESSAGES.confirmation)))
  confirmarNombreDeCliente?: boolean;
}

/** Parte nueva (RF-13 a RF-15): cliente (clienteId) o no cliente (tipo de persona y datos). */
export class CreateParteDto extends ParteDataDto {
  @Rule(personType(() => PARTE_MESSAGES.tipoPersonaRequired))
  tipoPersona?: TipoPersona;
}

/**
 * Modificación de una parte (RF-16, RF-21), con tres formas: solo el rol; los datos
 * completos de una parte no cliente; o { rol, clienteId } para convertirla en parte cliente.
 * Qué forma corresponde a cada parte lo controla el service.
 */
export class UpdateParteDto extends ParteDataDto {
  @Rule(personType((object) => (hasOwnData(object) ? PARTE_MESSAGES.tipoPersonaRequired : null)))
  tipoPersona?: TipoPersona;
}

export type ParteValidation =
  { parte: CreateParteDto; messages: [] } | { parte: null; messages: string[] };

/**
 * Valida una parte suelta del alta con las mismas opciones que el ValidationPipe global,
 * sin lanzar excepciones: así el alta guarda las partes válidas e informa el resto (RF-7).
 */
export async function validateCreateParte(raw: unknown): Promise<ParteValidation> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { parte: null, messages: [CAUSA_MESSAGES.parteObject] };
  }
  const parte = plainToInstance(CreateParteDto, raw);
  const errors = await validate(parte, { whitelist: true, forbidNonWhitelisted: true });
  const messages = formatValidationErrors(errors);
  return messages.length > 0 ? { parte: null, messages } : { parte, messages: [] };
}
