import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeSessionService,
  fakeUsersService,
  renderApp,
  testAccount,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { UsuarioPropio } from '../servicios/sesion';
import type { UsersService, UsuarioDetalle } from '../servicios/usuarios';

const TEMPORARY = 'clave temporal 2026';
const principal = testUser('admin', { id: 1, esPrincipal: true });
const lawyer = testUser('abogado', { id: 3 });

async function openDetail(
  actor: UsuarioPropio,
  account: UsuarioDetalle,
  overrides: Partial<UsersService> = {},
) {
  const users = fakeUsersService({ getUser: vi.fn().mockResolvedValue(account), ...overrides });
  const session = fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(actor) });
  renderApp(`/panel/usuarios/${account.id}`, session, { users });
  await screen.findByRole('form', { name: 'Editar datos' });
  return users;
}

const actionsRegion = () => screen.queryByRole('region', { name: 'Acciones' });
const actionButtons = () =>
  within(actionsRegion()!)
    .getAllByRole('button')
    .map((button) => button.textContent);

async function choose(action: string, temporaryPassword?: string) {
  const user = userEvent.setup();
  await user.click(within(actionsRegion()!).getByRole('button', { name: action }));
  if (temporaryPassword !== undefined) {
    await user.type(screen.getByLabelText('Contraseña temporal'), temporaryPassword);
  }
  await user.click(screen.getByRole('button', { name: 'Confirmar' }));
}

describe('PanelUsuarioDetalle — acciones (T43)', () => {
  it('el principal ve todas las acciones sobre otro administrador activo', async () => {
    await openDetail(principal, testAccount({ id: 4, rol: 'admin' }));

    expect(actionButtons()).toEqual([
      'Desactivar cuenta',
      'Restablecer contraseña',
      'Transferir administrador principal',
    ]);
  });

  it('un abogado sobre un cliente desactivado solo ve reactivar', async () => {
    await openDetail(lawyer, testAccount({ id: 7, rol: 'cliente', activo: false }));

    expect(actionButtons()).toEqual(['Reactivar cuenta']);
  });

  it('sin acciones posibles no muestra la sección', async () => {
    await openDetail(
      testUser('admin', { id: 2 }),
      testAccount({ id: 1, rol: 'admin', esPrincipal: true }),
    );

    expect(actionsRegion()).toBeNull();
  });

  it('desactivar pide confirmación, llama al servicio y recarga la cuenta', async () => {
    const account = testAccount({ id: 7, rol: 'cliente' });
    const users = await openDetail(lawyer, account);
    users.getUser.mockResolvedValue({ ...account, activo: false });

    await choose('Desactivar cuenta');

    expect(await screen.findByText('Cuenta desactivada')).toBeTruthy();
    expect(users.deactivateUser).toHaveBeenCalledWith(7);
    expect(users.getUser).toHaveBeenCalledTimes(2);
    expect(actionButtons()).toEqual(['Reactivar cuenta']);
  });

  it('cancelar no hace nada', async () => {
    const users = await openDetail(lawyer, testAccount({ id: 7, rol: 'cliente' }));
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Desactivar cuenta' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('button', { name: 'Confirmar' })).toBeNull();
    expect(users.deactivateUser).not.toHaveBeenCalled();
  });

  it('reactivar envía la contraseña temporal', async () => {
    const users = await openDetail(lawyer, testAccount({ id: 7, rol: 'cliente', activo: false }));

    await choose('Reactivar cuenta', TEMPORARY);

    expect(await screen.findByText('Cuenta reactivada')).toBeTruthy();
    expect(users.reactivateUser).toHaveBeenCalledWith(7, TEMPORARY);
  });

  it('restablecer la contraseña envía la temporal', async () => {
    const users = await openDetail(principal, testAccount({ id: 5, rol: 'abogado' }));

    await choose('Restablecer contraseña', TEMPORARY);

    expect(await screen.findByText('Contraseña restablecida')).toBeTruthy();
    expect(users.resetPassword).toHaveBeenCalledWith(5, TEMPORARY);
  });

  it('valida la contraseña temporal antes de enviar', async () => {
    const users = await openDetail(principal, testAccount({ id: 5, rol: 'abogado' }));

    await choose('Restablecer contraseña', 'corta');

    expect((await screen.findByRole('alert')).textContent).toBe(
      'La contraseña debe tener al menos 10 caracteres',
    );
    expect(users.resetPassword).not.toHaveBeenCalled();
  });

  it('liberar el email llama al servicio', async () => {
    const users = await openDetail(
      principal,
      testAccount({ id: 7, rol: 'cliente', activo: false }),
    );

    await choose('Liberar email');

    expect(await screen.findByText('Email liberado')).toBeTruthy();
    expect(users.releaseEmail).toHaveBeenCalledWith(7);
  });

  it('al transferir, el actor deja de ser principal y ya no ve esa acción', async () => {
    const users = await openDetail(
      principal,
      testAccount({ id: 4, rol: 'admin', nombre: 'Mario', apellido: 'Rossi' }),
    );

    await choose('Transferir administrador principal');

    expect(await screen.findByText('Mario Rossi es ahora el administrador principal')).toBeTruthy();
    expect(users.transferPrincipal).toHaveBeenCalledWith(4);
    expect(actionButtons()).toEqual(['Desactivar cuenta', 'Restablecer contraseña']);
  });

  it('muestra el error de la API', async () => {
    await openDetail(principal, testAccount({ id: 4, rol: 'admin' }), {
      deactivateUser: vi
        .fn()
        .mockRejectedValue(new ApiError(409, ['No se puede modificar al administrador principal'])),
    });

    await choose('Desactivar cuenta');

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se puede modificar al administrador principal',
    );
  });
});
