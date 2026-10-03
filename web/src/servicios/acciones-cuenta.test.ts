import { describe, expect, it } from 'vitest';
import { testAccount, testUser } from '../pruebas/aplicacion-de-prueba';
import { availableActions } from './acciones-cuenta';

const principal = testUser('admin', { id: 1, esPrincipal: true });
const admin = testUser('admin', { id: 2 });
const lawyer = testUser('abogado', { id: 3 });
const client = testUser('cliente', { id: 6 });

const principalAccount = testAccount({ id: 1, rol: 'admin', esPrincipal: true });
const otherAdmin = testAccount({ id: 4, rol: 'admin' });
const otherLawyer = testAccount({ id: 5, rol: 'abogado' });
const activeClient = testAccount({ id: 6, rol: 'cliente' });
const inactiveClient = testAccount({ id: 7, rol: 'cliente', activo: false });
const inactiveWithoutEmail = testAccount({ id: 8, rol: 'cliente', activo: false, email: null });
const inactiveAdmin = testAccount({ id: 9, rol: 'admin', activo: false });

describe('availableActions (RF-21, RF-24, RF-29 a RF-33)', () => {
  it.each([
    // Principal
    [
      'principal',
      principal,
      'otro administrador',
      otherAdmin,
      ['deactivate', 'resetPassword', 'transferPrincipal'],
    ],
    ['principal', principal, 'un abogado', otherLawyer, ['deactivate', 'resetPassword']],
    ['principal', principal, 'un cliente activo', activeClient, ['deactivate', 'resetPassword']],
    [
      'principal',
      principal,
      'un cliente desactivado',
      inactiveClient,
      ['reactivate', 'releaseEmail'],
    ],
    [
      'principal',
      principal,
      'un administrador desactivado',
      inactiveAdmin,
      ['reactivate', 'releaseEmail'],
    ],
    ['principal', principal, 'sí mismo', principalAccount, []],
    // Administrador común
    ['administrador', admin, 'el principal', principalAccount, []],
    ['administrador', admin, 'otro administrador', otherAdmin, ['deactivate', 'resetPassword']],
    ['administrador', admin, 'un cliente activo', activeClient, ['deactivate', 'resetPassword']],
    [
      'administrador',
      admin,
      'un cliente desactivado sin email',
      inactiveWithoutEmail,
      ['reactivate'],
    ],
    ['administrador', admin, 'sí mismo', testAccount({ id: 2, rol: 'admin' }), []],
    // Abogado: solo clientes, sin liberar emails
    ['abogado', lawyer, 'un cliente activo', activeClient, ['deactivate', 'resetPassword']],
    ['abogado', lawyer, 'un cliente desactivado', inactiveClient, ['reactivate']],
    ['abogado', lawyer, 'un administrador', otherAdmin, []],
    ['abogado', lawyer, 'otro abogado', otherLawyer, []],
    // Cliente
    ['cliente', client, 'sí mismo', activeClient, []],
  ] as const)('%s sobre %s', (_actor, actor, _target, account, expected) => {
    expect(availableActions(actor, account)).toEqual(expected);
  });
});
