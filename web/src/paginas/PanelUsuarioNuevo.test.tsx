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
import type { Rol } from '../servicios/sesion';
import type { CreateUserData, UsuarioDetalle } from '../servicios/usuarios';

async function openForm(
  options: { rol?: Rol; createUser?: (data: CreateUserData) => Promise<UsuarioDetalle> } = {},
) {
  const users = fakeUsersService({
    createUser: vi.fn(options.createUser ?? (async () => testAccount({ id: 42 }))),
    getUser: vi.fn().mockResolvedValue(testAccount({ id: 42 })),
  });
  renderApp(
    '/panel/usuarios/nuevo',
    fakeSessionService({
      fetchOwnUser: vi.fn().mockResolvedValue(testUser(options.rol ?? 'admin')),
    }),
    { users },
  );
  await screen.findByRole('heading', { name: 'Nueva cuenta' });
  return users;
}

const fieldLabels = () =>
  Array.from(document.querySelectorAll('form label')).map((label) => label.textContent);

describe('PanelUsuarioNuevo (RF-3, RF-21, RF-22)', () => {
  describe('campos según el rol y el tipo de persona', () => {
    it('para un cliente persona física (el caso por defecto)', async () => {
      await openForm();

      expect(fieldLabels()).toEqual([
        'Rol',
        'Tipo de persona',
        'Nombre',
        'Apellido',
        'DNI',
        'Email',
        'Teléfono',
        'Domicilio',
        'Contraseña temporal',
      ]);
    });

    it('para un cliente persona jurídica', async () => {
      await openForm();

      await userEvent.setup().selectOptions(screen.getByLabelText('Tipo de persona'), 'juridica');

      expect(fieldLabels()).toEqual([
        'Rol',
        'Tipo de persona',
        'Razón social',
        'CUIT',
        'Nombre del contacto',
        'Apellido del contacto',
        'Email',
        'Teléfono',
        'Domicilio',
        'Contraseña temporal',
      ]);
    });

    it('para un integrante', async () => {
      await openForm();

      await userEvent.setup().selectOptions(screen.getByLabelText('Rol'), 'abogado');

      expect(fieldLabels()).toEqual(['Rol', 'Nombre', 'Apellido', 'Email', 'Contraseña temporal']);
    });

    it('un abogado solo crea clientes: no ve el selector de rol', async () => {
      await openForm({ rol: 'abogado' });

      expect(fieldLabels()[0]).toBe('Tipo de persona');
      expect(screen.queryByLabelText('Rol')).toBeNull();
    });
  });

  it('valida antes de enviar y muestra todos los problemas', async () => {
    const users = await openForm();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Crear cuenta' }));

    const alert = await screen.findByRole('alert');
    expect(
      within(alert)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'El email es obligatorio',
      'El nombre es obligatorio',
      'El apellido es obligatorio',
      'La contraseña temporal es obligatoria',
      'El DNI es obligatorio para personas físicas',
    ]);
    expect(users.createUser).not.toHaveBeenCalled();
  });

  it('crea un cliente persona física y lleva a su detalle', async () => {
    const users = await openForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Apellido'), 'Gómez');
    await user.type(screen.getByLabelText('DNI'), '30.123.456');
    await user.type(screen.getByLabelText('Email'), 'ana@correo.com');
    await user.type(screen.getByLabelText('Contraseña temporal'), 'clave temporal 2026');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Detalle de la cuenta' })).toBeTruthy();
    expect(users.createUser).toHaveBeenCalledWith({
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      contrasenaTemporal: 'clave temporal 2026',
      cliente: { tipoPersona: 'fisica', dni: '30.123.456' },
    });
  });

  it('crea un abogado sin datos de cliente', async () => {
    const users = await openForm();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText('Rol'), 'abogado');
    await user.type(screen.getByLabelText('Nombre'), 'Marcos');
    await user.type(screen.getByLabelText('Apellido'), 'Díaz');
    await user.type(screen.getByLabelText('Email'), 'marcos@estudio.com');
    await user.type(screen.getByLabelText('Contraseña temporal'), 'clave temporal 2026');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await screen.findByRole('heading', { name: 'Detalle de la cuenta' });
    expect(users.createUser).toHaveBeenCalledWith({
      rol: 'abogado',
      email: 'marcos@estudio.com',
      nombre: 'Marcos',
      apellido: 'Díaz',
      contrasenaTemporal: 'clave temporal 2026',
    });
  });

  it.each([
    'Ya existe una cuenta con ese email',
    'Ya existe un cliente con ese DNI o CUIT. Está desactivado: reactivalo en lugar de crear uno nuevo',
  ])('muestra el 409 de la API: %s', async (message) => {
    await openForm({
      createUser: async () => {
        throw new ApiError(409, [message]);
      },
    });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Apellido'), 'Gómez');
    await user.type(screen.getByLabelText('DNI'), '30123456');
    await user.type(screen.getByLabelText('Email'), 'ana@correo.com');
    await user.type(screen.getByLabelText('Contraseña temporal'), 'clave temporal 2026');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(screen.getByRole('heading', { name: 'Nueva cuenta' })).toBeTruthy();
  });
});
