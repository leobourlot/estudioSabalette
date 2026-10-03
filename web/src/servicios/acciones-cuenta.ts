import { fullName } from './presentacion';
import type { UsuarioPropio } from './sesion';
import type { UsuarioDetalle } from './usuarios';

/**
 * Acciones sobre una cuenta (RF-24, RF-29 a RF-33) y quién las ve. Replica las reglas de la
 * API (api/src/usuarios/permisos-gestion.ts) solo para no ofrecer botones que fallarían: el
 * control real lo hace la API. No importa React (principio 3).
 */

export type AccountAction =
  'deactivate' | 'reactivate' | 'resetPassword' | 'releaseEmail' | 'transferPrincipal';

export function availableActions(actor: UsuarioPropio, account: UsuarioDetalle): AccountAction[] {
  // Sobre la propia cuenta no se ofrece nada: la contraseña se cambia desde Mi cuenta.
  if (actor.rol === 'cliente' || actor.id === account.id) return [];
  // Un abogado opera solo sobre clientes (RF-21).
  if (actor.rol === 'abogado' && account.rol !== 'cliente') return [];
  // Nadie más que el propio principal puede desactivarlo ni restablecerle la contraseña (RF-31).
  if (account.esPrincipal) return [];

  if (!account.activo) {
    // Liberar el email es solo para administradores (RF-24).
    return actor.rol === 'admin' && account.email !== null
      ? ['reactivate', 'releaseEmail']
      : ['reactivate'];
  }

  const actions: AccountAction[] = ['deactivate', 'resetPassword'];
  // Solo el principal transfiere su condición, y solo a otro administrador activo (RF-32).
  if (actor.esPrincipal && account.rol === 'admin') actions.push('transferPrincipal');
  return actions;
}

interface ActionText {
  label: string;
  /** Qué va a pasar, para confirmar. */
  description: string;
  needsTemporaryPassword: boolean;
  done: (account: UsuarioDetalle) => string;
}

export const ACTION_TEXTS: Record<AccountAction, ActionText> = {
  deactivate: {
    label: 'Desactivar cuenta',
    description:
      'La persona no va a poder ingresar y se cierra su sesión. La cuenta no se borra y se puede reactivar.',
    needsTemporaryPassword: false,
    done: () => 'Cuenta desactivada',
  },
  reactivate: {
    label: 'Reactivar cuenta',
    description:
      'Indicá una contraseña temporal nueva y comunicásela a la persona: al ingresar va a tener que cambiarla.',
    needsTemporaryPassword: true,
    done: () => 'Cuenta reactivada',
  },
  resetPassword: {
    label: 'Restablecer contraseña',
    description:
      'Se cierra su sesión. Comunicale la contraseña temporal: al ingresar va a tener que cambiarla.',
    needsTemporaryPassword: true,
    done: () => 'Contraseña restablecida',
  },
  releaseEmail: {
    label: 'Liberar email',
    description:
      'El email queda disponible para otra cuenta. Para reactivar esta, primero hay que asignarle un email nuevo.',
    needsTemporaryPassword: false,
    done: () => 'Email liberado',
  },
  transferPrincipal: {
    label: 'Transferir administrador principal',
    description:
      'Esta persona pasa a ser el administrador principal y vos, un administrador común.',
    needsTemporaryPassword: false,
    done: (account) => `${fullName(account)} es ahora el administrador principal`,
  },
};
