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
import type { UpdateUserData, UsuarioDetalle } from '../servicios/usuarios';

const naturalClient = testAccount({
  id: 7,
  rol: 'cliente',
  nombre: 'Ana',
  apellido: 'Gómez',
  email: 'ana@correo.com',
  creadoEn: '2026-09-01T15:00:00.000Z',
  creadoPor: { id: 3, nombre: 'Juan', apellido: 'Pérez' },
  cliente: {
    tipoPersona: 'fisica',
    dni: '30123456',
    cuit: null,
    razonSocial: null,
    telefono: '3415551234',
    domicilio: null,
  },
});

const legalClient = testAccount({
  id: 8,
  rol: 'cliente',
  nombre: 'Laura',
  apellido: 'Sosa',
  cliente: {
    tipoPersona: 'juridica',
    dni: null,
    cuit: '30712345671',
    razonSocial: 'Acme SRL',
    telefono: null,
    domicilio: null,
  },
});

const lawyerAccount = testAccount({
  id: 9,
  rol: 'abogado',
  nombre: 'Marcos',
  apellido: 'Díaz',
  ultimoIngreso: '2026-10-02T13:05:00.000Z',
  modificadoEn: '2026-10-01T18:30:00.000Z',
  modificadoPor: { id: 1, nombre: 'Carla', apellido: 'Sabalette' },
});

async function openDetail(
  account: UsuarioDetalle,
  options: {
    actor?: Rol;
    getUser?: () => Promise<UsuarioDetalle>;
    updateUser?: (id: number, changes: UpdateUserData) => Promise<UsuarioDetalle>;
  } = {},
) {
  const users = fakeUsersService({
    getUser: vi.fn(options.getUser ?? (async () => account)),
    updateUser: vi.fn(options.updateUser ?? (async () => account)),
  });
  renderApp(
    `/panel/usuarios/${account.id}`,
    fakeSessionService({
      fetchOwnUser: vi.fn().mockResolvedValue(testUser(options.actor ?? 'admin')),
    }),
    { users },
  );
  // El título aparece antes de que cargue la cuenta: se espera el formulario, que llega con ella.
  await screen.findByRole('form', { name: 'Editar datos' });
  return users;
}

/** Valor que acompaña a una etiqueta en la lista de datos. */
const dataValue = async (label: string) => {
  const list = await screen.findByLabelText('Datos de la cuenta');
  return within(list).getByText(label).nextElementSibling?.textContent;
};

const editForm = () => screen.getByRole('form', { name: 'Editar datos' });

describe('PanelUsuarioDetalle — datos y auditoría (RF-34)', () => {
  it('muestra el DNI de solo lectura: no hay campo para editarlo (RF-7)', async () => {
    await openDetail(naturalClient);

    expect(await dataValue('DNI')).toBe('30.123.456');
    expect(await dataValue('Tipo de persona')).toBe('Persona física');
    expect(within(editForm()).queryByLabelText('DNI')).toBeNull();
    expect(within(editForm()).queryByLabelText('Tipo de persona')).toBeNull();
  });

  it('muestra el CUIT de solo lectura y deja editar la razón social', async () => {
    await openDetail(legalClient);

    expect(await dataValue('CUIT')).toBe('30-71234567-1');
    expect(within(editForm()).queryByLabelText('CUIT')).toBeNull();
    expect(within(editForm()).getByLabelText('Razón social')).toBeTruthy();
  });

  it('muestra la auditoría con las fechas en hora de Buenos Aires', async () => {
    await openDetail(lawyerAccount);

    expect(await dataValue('Creada')).toBe('01/09/2026 12:00');
    expect(await dataValue('Última modificación')).toBe('01/10/2026 15:30 por Carla Sabalette');
    expect(await dataValue('Último ingreso')).toBe('02/10/2026 10:05');
    expect(await dataValue('Estado')).toBe('Activa');
  });

  it('indica quién creó la cuenta y cuándo nunca ingresó', async () => {
    await openDetail(naturalClient);

    expect(await dataValue('Creada')).toBe('01/09/2026 12:00 por Juan Pérez');
    expect(await dataValue('Última modificación')).toBe('—');
    expect(await dataValue('Último ingreso')).toBe('Nunca');
  });

  it('responde con el mensaje de la API si la cuenta no existe', async () => {
    renderApp(
      '/panel/usuarios/999',
      fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser('admin')) }),
      {
        users: fakeUsersService({
          getUser: vi.fn().mockRejectedValue(new ApiError(404, ['No existe esa cuenta'])),
        }),
      },
    );

    expect((await screen.findByRole('alert')).textContent).toBe('No existe esa cuenta');
  });
});

describe('PanelUsuarioDetalle — edición (RF-27, RF-28)', () => {
  it('el selector de rol de un integrante solo ofrece administrador y abogado', async () => {
    await openDetail(lawyerAccount);

    const select = within(editForm()).getByLabelText('Rol');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Administrador', 'Abogado']);
  });

  it('una cuenta de cliente no tiene selector de rol', async () => {
    await openDetail(naturalClient);

    expect(within(editForm()).queryByLabelText('Rol')).toBeNull();
  });

  it('un abogado no puede cambiar roles: no ve el selector', async () => {
    await openDetail(naturalClient, { actor: 'abogado' });

    expect(within(editForm()).queryByLabelText('Rol')).toBeNull();
    expect(within(editForm()).getByLabelText('Teléfono')).toBeTruthy();
  });

  it('guarda solo los cambios y muestra los datos actualizados', async () => {
    const updated = {
      ...naturalClient,
      nombre: 'Ana María',
      cliente: { ...naturalClient.cliente!, telefono: null },
    };
    const users = await openDetail(naturalClient, { updateUser: async () => updated });
    const user = userEvent.setup();
    const form = editForm();

    await user.clear(within(form).getByLabelText('Nombre'));
    await user.type(within(form).getByLabelText('Nombre'), 'Ana María');
    await user.clear(within(form).getByLabelText('Teléfono'));
    await user.click(within(form).getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Cambios guardados');
    expect(users.updateUser).toHaveBeenCalledWith(7, {
      nombre: 'Ana María',
      cliente: { telefono: null },
    });
    expect(await dataValue('Nombre')).toBe('Ana María');
    expect(await dataValue('Teléfono')).toBe('—');
  });

  it('cambia el rol de un integrante', async () => {
    const users = await openDetail(lawyerAccount, {
      updateUser: async () => ({ ...lawyerAccount, rol: 'admin' }),
    });
    const user = userEvent.setup();

    await user.selectOptions(within(editForm()).getByLabelText('Rol'), 'admin');
    await user.click(within(editForm()).getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByRole('status');
    expect(users.updateUser).toHaveBeenCalledWith(9, { rol: 'admin' });
  });

  it('sin cambios, avisa y no llama a la API', async () => {
    const users = await openDetail(naturalClient);

    await userEvent
      .setup()
      .click(within(editForm()).getByRole('button', { name: 'Guardar cambios' }));

    expect((await screen.findByRole('alert')).textContent).toBe('No hay cambios para guardar');
    expect(users.updateUser).not.toHaveBeenCalled();
  });

  it('valida antes de enviar', async () => {
    const users = await openDetail(naturalClient);
    const user = userEvent.setup();

    await user.clear(within(editForm()).getByLabelText('Nombre'));
    await user.click(within(editForm()).getByRole('button', { name: 'Guardar cambios' }));

    expect((await screen.findByRole('alert')).textContent).toBe('El nombre es obligatorio');
    expect(users.updateUser).not.toHaveBeenCalled();
  });

  it('muestra el error de la API', async () => {
    await openDetail(lawyerAccount, {
      updateUser: async () => {
        throw new ApiError(409, ['Ya existe una cuenta con ese email']);
      },
    });
    const user = userEvent.setup();

    await user.clear(within(editForm()).getByLabelText('Email'));
    await user.type(within(editForm()).getByLabelText('Email'), 'ana@correo.com');
    await user.click(within(editForm()).getByRole('button', { name: 'Guardar cambios' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Ya existe una cuenta con ese email',
    );
  });
});
