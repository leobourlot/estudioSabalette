import { FORBIDDEN_MESSAGE } from '../autenticacion/roles.guard.js';
import type { Rol, Usuario } from './usuario.entity.js';

/**
 * Reglas de gestión de cuentas (RF-21, RF-24, RF-28, RF-31, RF-32), como funciones puras
 * sin acceso a la base. El service las consulta antes de cada operación y convierte la
 * decisión en la respuesta HTTP.
 */

export type Actor = Pick<Usuario, 'id' | 'rol' | 'esPrincipal'>;
export type Target = Pick<Usuario, 'id' | 'rol' | 'esPrincipal' | 'activo'>;

export type AccountAction =
  | 'view'
  | 'update'
  | 'deactivate'
  | 'reactivate'
  | 'resetPassword'
  | 'releaseEmail'
  | 'transferPrincipal';

/** Qué cambia una modificación, para las reglas que dependen del campo. */
export interface AccountChange {
  email?: boolean;
  rol?: Rol;
}

/** null si la acción está permitida; si no, el código HTTP y el mensaje. */
export type PolicyDecision = { status: 400 | 403 | 409; message: string } | null;

export const MANAGEMENT_MESSAGES = {
  forbidden: FORBIDDEN_MESSAGE,
  principal: 'No se puede modificar al administrador principal',
  roleChange: 'Solo se puede cambiar el rol entre administrador y abogado',
  transferTarget: 'Solo se puede transferir a otro administrador activo',
  releaseActiveEmail: 'Solo se puede liberar el email de una cuenta desactivada',
} as const;

const STAFF_ROLES: readonly Rol[] = ['admin', 'abogado'];

const forbidden = (): PolicyDecision => ({ status: 403, message: MANAGEMENT_MESSAGES.forbidden });
const conflict = (message: string): PolicyDecision => ({ status: 409, message });

/** Un abogado solo crea clientes; un administrador crea cualquier cuenta (RF-21). */
export function checkCreate(actor: Actor, rol: Rol): PolicyDecision {
  if (actor.rol === 'admin') return null;
  if (actor.rol === 'abogado' && rol === 'cliente') return null;
  return forbidden();
}

export function checkAccountAction(
  actor: Actor,
  target: Target,
  action: AccountAction,
  change: AccountChange = {},
): PolicyDecision {
  const changesRole = action === 'update' && change.rol !== undefined && change.rol !== target.rol;

  if (actor.rol === 'cliente') return forbidden();

  // Un abogado opera solo sobre clientes, sin liberar emails, transferir ni cambiar roles.
  if (actor.rol === 'abogado') {
    if (target.rol !== 'cliente') return forbidden();
    if (action === 'releaseEmail' || action === 'transferPrincipal' || changesRole) {
      return forbidden();
    }
    return null;
  }

  // Desde acá, el actor es administrador.
  if (action === 'transferPrincipal') {
    if (!actor.esPrincipal) return forbidden();
    const isValidTarget = target.id !== actor.id && target.rol === 'admin' && target.activo;
    return isValidTarget ? null : conflict(MANAGEMENT_MESSAGES.transferTarget);
  }

  if (action === 'releaseEmail') {
    return target.activo ? conflict(MANAGEMENT_MESSAGES.releaseActiveEmail) : null;
  }

  // El principal no pierde el rol ni se desactiva, ni siquiera por decisión propia; los
  // demás administradores tampoco pueden cambiarle el email ni la contraseña (RF-31).
  if (target.esPrincipal) {
    const isSelf = target.id === actor.id;
    if (action === 'deactivate' || changesRole) return conflict(MANAGEMENT_MESSAGES.principal);
    if (!isSelf && (action === 'resetPassword' || (action === 'update' && change.email))) {
      return conflict(MANAGEMENT_MESSAGES.principal);
    }
  }

  // El rol solo cambia entre administrador y abogado (RF-28).
  if (changesRole && (!STAFF_ROLES.includes(target.rol) || !STAFF_ROLES.includes(change.rol!))) {
    return { status: 400, message: MANAGEMENT_MESSAGES.roleChange };
  }

  return null;
}
