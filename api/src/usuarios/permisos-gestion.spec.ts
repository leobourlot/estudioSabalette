import { describe, expect, it } from 'vitest';
import {
  type AccountAction,
  type Actor,
  checkAccountAction,
  checkCreate,
  MANAGEMENT_MESSAGES,
  type Target,
} from './permisos-gestion.js';

const principal: Actor & Target = { id: 1, rol: 'admin', esPrincipal: true, activo: true };
const admin: Actor & Target = { id: 2, rol: 'admin', esPrincipal: false, activo: true };
const lawyer: Actor & Target = { id: 3, rol: 'abogado', esPrincipal: false, activo: true };
const otherAdmin: Target = { id: 4, rol: 'admin', esPrincipal: false, activo: true };
const otherLawyer: Target = { id: 5, rol: 'abogado', esPrincipal: false, activo: true };
const client: Target = { id: 6, rol: 'cliente', esPrincipal: false, activo: true };
const clientActor: Actor = { id: 6, rol: 'cliente', esPrincipal: false };

const OK = 'ok';
const FORBIDDEN = 403;
const CONFLICT = 409;
type Expected = typeof OK | typeof FORBIDDEN | typeof CONFLICT;

const ACTIONS: AccountAction[] = [
  'view',
  'update',
  'deactivate',
  'reactivate',
  'resetPassword',
  'transferPrincipal',
];

/**
 * Matriz de RF-21, RF-31 y RF-32: actor × destino × acción. Cada fila sigue el orden de
 * ACTIONS. "update" es una modificación sin cambio de email ni de rol.
 */
const MATRIX: [string, Actor, string, Target, Expected[]][] = [
  // view, update, deactivate, reactivate, resetPassword, transferPrincipal
  ['principal', principal, 'sí mismo', principal, [OK, OK, CONFLICT, OK, OK, CONFLICT]],
  ['principal', principal, 'otro administrador', otherAdmin, [OK, OK, OK, OK, OK, OK]],
  ['principal', principal, 'un abogado', otherLawyer, [OK, OK, OK, OK, OK, CONFLICT]],
  ['principal', principal, 'un cliente', client, [OK, OK, OK, OK, OK, CONFLICT]],
  ['administrador', admin, 'el principal', principal, [OK, OK, CONFLICT, OK, CONFLICT, FORBIDDEN]],
  ['administrador', admin, 'sí mismo', admin, [OK, OK, OK, OK, OK, FORBIDDEN]],
  ['administrador', admin, 'otro administrador', otherAdmin, [OK, OK, OK, OK, OK, FORBIDDEN]],
  ['administrador', admin, 'un abogado', otherLawyer, [OK, OK, OK, OK, OK, FORBIDDEN]],
  ['administrador', admin, 'un cliente', client, [OK, OK, OK, OK, OK, FORBIDDEN]],
  ['abogado', lawyer, 'el principal', principal, Array(6).fill(FORBIDDEN)],
  ['abogado', lawyer, 'un administrador', otherAdmin, Array(6).fill(FORBIDDEN)],
  ['abogado', lawyer, 'sí mismo', lawyer, Array(6).fill(FORBIDDEN)],
  ['abogado', lawyer, 'otro abogado', otherLawyer, Array(6).fill(FORBIDDEN)],
  ['abogado', lawyer, 'un cliente', client, [OK, OK, OK, OK, OK, FORBIDDEN]],
  ['cliente', clientActor, 'sí mismo', client, Array(6).fill(FORBIDDEN)],
];

function outcome(decision: ReturnType<typeof checkAccountAction>): Expected {
  return decision === null ? OK : (decision.status as Expected);
}

describe('checkAccountAction — matriz de permisos', () => {
  for (const [actorName, actor, targetName, target, expected] of MATRIX) {
    it.each(ACTIONS.map((action, index) => [action, expected[index]] as const))(
      `${actorName} sobre ${targetName}: %s → %s`,
      (action, result) => {
        expect(outcome(checkAccountAction(actor, target, action))).toBe(result);
      },
    );
  }

  it('usa el mensaje de RF-19 para los 403 y el de RF-31 para el principal', () => {
    expect(checkAccountAction(lawyer, otherAdmin, 'view')?.message).toBe(
      'No tenés permiso para realizar esta acción',
    );
    expect(checkAccountAction(admin, principal, 'deactivate')?.message).toBe(
      'No se puede modificar al administrador principal',
    );
  });
});

describe('checkAccountAction — modificación de email y rol', () => {
  it('ningún otro administrador puede cambiar el email del principal (RF-31)', () => {
    expect(checkAccountAction(admin, principal, 'update', { email: true })).toEqual({
      status: 409,
      message: MANAGEMENT_MESSAGES.principal,
    });
    expect(checkAccountAction(principal, principal, 'update', { email: true })).toBeNull();
  });

  it('nadie puede quitarle el rol al principal, ni el propio principal (RF-31)', () => {
    expect(checkAccountAction(admin, principal, 'update', { rol: 'abogado' })?.status).toBe(409);
    expect(checkAccountAction(principal, principal, 'update', { rol: 'abogado' })?.status).toBe(
      409,
    );
  });

  it('un administrador cambia el rol entre administrador y abogado (RF-28)', () => {
    expect(checkAccountAction(admin, otherLawyer, 'update', { rol: 'admin' })).toBeNull();
    expect(checkAccountAction(admin, otherAdmin, 'update', { rol: 'abogado' })).toBeNull();
    expect(checkAccountAction(admin, admin, 'update', { rol: 'abogado' })).toBeNull();
  });

  it.each([
    ['un cliente a abogado', client, 'abogado'],
    ['un cliente a administrador', client, 'admin'],
    ['un abogado a cliente', otherLawyer, 'cliente'],
    ['un administrador a cliente', otherAdmin, 'cliente'],
  ] as const)('rechaza con 400 pasar %s (RF-28)', (_case, target, rol) => {
    expect(checkAccountAction(admin, target, 'update', { rol })).toEqual({
      status: 400,
      message: MANAGEMENT_MESSAGES.roleChange,
    });
  });

  it('el mismo rol no es un cambio', () => {
    expect(checkAccountAction(admin, client, 'update', { rol: 'cliente' })).toBeNull();
    expect(checkAccountAction(lawyer, client, 'update', { rol: 'cliente' })).toBeNull();
  });

  it('un abogado no puede cambiar roles', () => {
    expect(checkAccountAction(lawyer, client, 'update', { rol: 'abogado' })?.status).toBe(403);
  });
});

describe('checkAccountAction — liberar email (RF-24)', () => {
  const inactive = (target: Target): Target => ({ ...target, activo: false });

  it('solo un administrador libera el email de una cuenta desactivada', () => {
    expect(checkAccountAction(admin, inactive(client), 'releaseEmail')).toBeNull();
    expect(checkAccountAction(principal, inactive(otherLawyer), 'releaseEmail')).toBeNull();
    expect(checkAccountAction(lawyer, inactive(client), 'releaseEmail')?.status).toBe(403);
  });

  it('rechaza liberar el email de una cuenta activa', () => {
    expect(checkAccountAction(admin, client, 'releaseEmail')).toEqual({
      status: 409,
      message: MANAGEMENT_MESSAGES.releaseActiveEmail,
    });
  });
});

describe('checkAccountAction — transferir el principal (RF-32)', () => {
  it('solo a otro administrador activo', () => {
    expect(
      checkAccountAction(principal, { ...otherAdmin, activo: false }, 'transferPrincipal'),
    ).toEqual({
      status: 409,
      message: MANAGEMENT_MESSAGES.transferTarget,
    });
  });
});

describe('checkCreate (RF-21)', () => {
  it.each(['admin', 'abogado', 'cliente'] as const)('un administrador puede crear %s', (rol) => {
    expect(checkCreate(admin, rol)).toBeNull();
    expect(checkCreate(principal, rol)).toBeNull();
  });

  it('un abogado solo puede crear clientes', () => {
    expect(checkCreate(lawyer, 'cliente')).toBeNull();
    expect(checkCreate(lawyer, 'abogado')?.status).toBe(403);
    expect(checkCreate(lawyer, 'admin')?.status).toBe(403);
  });

  it('un cliente no puede crear cuentas', () => {
    expect(checkCreate(clientActor, 'cliente')?.status).toBe(403);
  });
});
