import type { Rol, TipoPersona } from './sesion';
import type { CreateUserData, UpdateUserData, UsuarioDetalle } from './usuarios';
import {
  findPasswordRuleViolation,
  fitsMaxLength,
  isBlank,
  MAX_PHONE_LENGTH,
  MAX_TEXT_LENGTH,
  normalizeEmail,
  validateCuit,
  validateDni,
  validateEmail,
} from './validaciones';

/**
 * Formulario de alta de una cuenta (RF-3, RF-21, RF-22): validación con los mismos
 * mensajes que la API y armado de los datos a enviar. No importa React (principio 3).
 */

export interface NewAccountForm {
  rol: Rol;
  tipoPersona: TipoPersona;
  nombre: string;
  apellido: string;
  email: string;
  contrasenaTemporal: string;
  dni: string;
  cuit: string;
  razonSocial: string;
  telefono: string;
  domicilio: string;
}

export const EMPTY_ACCOUNT_FORM: NewAccountForm = {
  rol: 'cliente',
  tipoPersona: 'fisica',
  nombre: '',
  apellido: '',
  email: '',
  contrasenaTemporal: '',
  dni: '',
  cuit: '',
  razonSocial: '',
  telefono: '',
  domicilio: '',
};

function requiredText(value: string, required: string, label: string): string | null {
  if (isBlank(value)) return required;
  return fitsMaxLength(value.trim(), MAX_TEXT_LENGTH)
    ? null
    : `${label} no puede tener más de ${MAX_TEXT_LENGTH} caracteres`;
}

function optionalText(value: string, label: string, max: number): string | null {
  return fitsMaxLength(value.trim(), max)
    ? null
    : `${label} no puede tener más de ${max} caracteres`;
}

/** Todos los problemas del formulario, en el orden de los campos; vacío si es válido. */
export function validateNewAccount(form: NewAccountForm): string[] {
  const problems = [
    validateEmail(form.email),
    requiredText(form.nombre, 'El nombre es obligatorio', 'El nombre'),
    requiredText(form.apellido, 'El apellido es obligatorio', 'El apellido'),
    form.contrasenaTemporal === ''
      ? 'La contraseña temporal es obligatoria'
      : findPasswordRuleViolation(form.contrasenaTemporal),
  ];

  if (form.rol === 'cliente') {
    if (form.tipoPersona === 'fisica') {
      problems.push(validateDni(form.dni));
    } else {
      problems.push(validateCuit(form.cuit));
      problems.push(
        requiredText(
          form.razonSocial,
          'La razón social es obligatoria para personas jurídicas',
          'La razón social',
        ),
      );
    }
    problems.push(optionalText(form.telefono, 'El teléfono', MAX_PHONE_LENGTH));
    problems.push(optionalText(form.domicilio, 'El domicilio', MAX_TEXT_LENGTH));
  }

  return problems.filter((problem): problem is string => problem !== null);
}

// --- Edición de una cuenta existente (RF-27, RF-28) ---

/** Campos editables. DNI, CUIT y tipo de persona no se modifican (RF-7). */
export interface AccountEditForm {
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  razonSocial: string;
  telefono: string;
  domicilio: string;
}

export function editFormFrom(account: UsuarioDetalle): AccountEditForm {
  return {
    nombre: account.nombre,
    apellido: account.apellido,
    email: account.email ?? '',
    rol: account.rol,
    razonSocial: account.cliente?.razonSocial ?? '',
    telefono: account.cliente?.telefono ?? '',
    domicilio: account.cliente?.domicilio ?? '',
  };
}

const isLegalPerson = (account: UsuarioDetalle) => account.cliente?.tipoPersona === 'juridica';

export function validateAccountEdit(form: AccountEditForm, account: UsuarioDetalle): string[] {
  // Una cuenta con el email liberado puede seguir sin email hasta que se le asigne uno.
  const keepsWithoutEmail = account.email === null && isBlank(form.email);
  const problems = [
    keepsWithoutEmail ? null : validateEmail(form.email),
    requiredText(form.nombre, 'El nombre es obligatorio', 'El nombre'),
    requiredText(form.apellido, 'El apellido es obligatorio', 'El apellido'),
  ];
  if (account.cliente) {
    if (isLegalPerson(account)) {
      problems.push(
        requiredText(
          form.razonSocial,
          'La razón social es obligatoria para personas jurídicas',
          'La razón social',
        ),
      );
    }
    problems.push(optionalText(form.telefono, 'El teléfono', MAX_PHONE_LENGTH));
    problems.push(optionalText(form.domicilio, 'El domicilio', MAX_TEXT_LENGTH));
  }
  return problems.filter((problem): problem is string => problem !== null);
}

/** Solo lo que cambió respecto de la cuenta; un teléfono o domicilio vaciado se envía como null. */
export function buildUpdateData(form: AccountEditForm, account: UsuarioDetalle): UpdateUserData {
  const changes: UpdateUserData = {};
  if (normalizeEmail(form.email) !== (account.email ?? '')) changes.email = form.email.trim();
  if (form.nombre.trim() !== account.nombre) changes.nombre = form.nombre.trim();
  if (form.apellido.trim() !== account.apellido) changes.apellido = form.apellido.trim();
  if (form.rol !== account.rol) changes.rol = form.rol;

  if (account.cliente) {
    const cliente: NonNullable<UpdateUserData['cliente']> = {};
    const optional = (value: string) => (isBlank(value) ? null : value.trim());
    if (isLegalPerson(account) && form.razonSocial.trim() !== account.cliente.razonSocial) {
      cliente.razonSocial = form.razonSocial.trim();
    }
    if (optional(form.telefono) !== account.cliente.telefono) {
      cliente.telefono = optional(form.telefono);
    }
    if (optional(form.domicilio) !== account.cliente.domicilio) {
      cliente.domicilio = optional(form.domicilio);
    }
    if (Object.keys(cliente).length > 0) changes.cliente = cliente;
  }
  return changes;
}

/** Datos para la API: solo los campos que corresponden al rol y al tipo de persona, sin vacíos. */
export function buildCreateUserData(form: NewAccountForm): CreateUserData {
  const data: CreateUserData = {
    rol: form.rol,
    email: form.email.trim(),
    nombre: form.nombre.trim(),
    apellido: form.apellido.trim(),
    contrasenaTemporal: form.contrasenaTemporal,
  };
  if (form.rol !== 'cliente') return data;

  const cliente: NonNullable<CreateUserData['cliente']> = { tipoPersona: form.tipoPersona };
  if (form.tipoPersona === 'fisica') {
    cliente.dni = form.dni.trim();
  } else {
    cliente.cuit = form.cuit.trim();
    cliente.razonSocial = form.razonSocial.trim();
  }
  if (!isBlank(form.telefono)) cliente.telefono = form.telefono.trim();
  if (!isBlank(form.domicilio)) cliente.domicilio = form.domicilio.trim();
  return { ...data, cliente };
}
