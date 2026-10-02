import type { TransformFnParams } from 'class-transformer';
import { registerDecorator, type ValidationArguments } from 'class-validator';
import { PERSON_TYPES, type TipoPersona } from '../cliente.entity.js';
import { ROLES } from '../usuario.entity.js';
import { isValidEmail } from '../validadores/email.js';
import { fitsMaxLength, isBlank } from '../validadores/longitudes.js';
import { normalizeDocumentNumber, normalizeEmail } from '../validadores/normalizar.js';

/** Regla de validación: devuelve el mensaje de error, o null si el valor es válido. */
export type RuleFn = (value: unknown, object: Record<string, unknown>) => string | null;

/**
 * Decorador de class-validator a partir de una regla. Permite mensajes en español que
 * indican el campo y la regla incumplida (RF-6), con lógica que depende de otros campos.
 */
export function Rule(rule: RuleFn): PropertyDecorator {
  return (target, propertyName) => {
    const check = (args: ValidationArguments) =>
      rule(args.value, args.object as Record<string, unknown>);
    registerDecorator({
      name: 'rule',
      target: target.constructor,
      propertyName: String(propertyName),
      validator: {
        validate: (_value: unknown, args: ValidationArguments) => check(args) === null,
        defaultMessage: (args: ValidationArguments) => check(args) ?? '',
      },
    });
  };
}

// --- Transformaciones (se aplican antes de validar) ---

const mapString =
  (fn: (value: string) => unknown) =>
  ({ value }: TransformFnParams): unknown =>
    typeof value === 'string' ? fn(value) : value;

export const trimText = mapString((value) => value.trim());
/** Recorta y convierte el texto vacío en null, para campos opcionales que se pueden borrar. */
export const trimOptionalText = mapString((value) => (value.trim() === '' ? null : value.trim()));
export const toNormalizedEmail = mapString(normalizeEmail);
export const toDocumentNumber = mapString(normalizeDocumentNumber);

// --- Reglas ---

const isPresent = (value: unknown) => value !== undefined && value !== null && value !== '';

/** Envuelve una regla para que un campo ausente (undefined) sea válido. */
export const optional =
  (rule: RuleFn): RuleFn =>
  (value, object) =>
    value === undefined ? null : rule(value, object);

export const requiredText =
  (messages: { required: string; tooLong: string }, max: number): RuleFn =>
  (value) => {
    if (typeof value !== 'string' || isBlank(value)) return messages.required;
    return fitsMaxLength(value, max) ? null : messages.tooLong;
  };

/** Texto opcional que acepta null para borrarlo. */
export const optionalText =
  (tooLong: string, max: number): RuleFn =>
  (value) => {
    if (value === undefined || value === null) return null;
    return typeof value === 'string' && fitsMaxLength(value, max) ? null : tooLong;
  };

export const emailRule: RuleFn = (value) => {
  if (typeof value !== 'string' || value === '') return 'El email es obligatorio';
  return isValidEmail(value) ? null : 'El email debe tener el formato texto@texto.texto';
};

export const rolRule: RuleFn = (value) =>
  (ROLES as readonly unknown[]).includes(value) ? null : 'El rol debe ser admin, abogado o cliente';

export const personTypeRule: RuleFn = (value) =>
  (PERSON_TYPES as readonly unknown[]).includes(value)
    ? null
    : 'El tipo de persona debe ser fisica o juridica';

export const temporaryPasswordRule: RuleFn = (value) => {
  if (typeof value !== 'string' || value === '') return 'La contraseña temporal es obligatoria';
  // Las reglas de RF-39 las aplica PasswordsService; acá solo se acota el tamaño.
  return value.length <= 256 ? null : 'La contraseña no puede tener más de 64 caracteres';
};

/**
 * Campo que corresponde solo a un tipo de persona: obligatorio y con formato para ese
 * tipo, y prohibido para el otro.
 */
export const onlyForPersonType =
  (
    personType: TipoPersona,
    messages: { required: string; forbidden: string },
    format: (value: unknown) => string | null,
  ): RuleFn =>
  (value, object) => {
    if (object.tipoPersona !== personType) {
      return isPresent(value) ? messages.forbidden : null;
    }
    return isPresent(value) ? format(value) : messages.required;
  };
