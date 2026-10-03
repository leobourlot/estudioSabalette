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
import type { UserPage, UsuarioDetalle } from '../servicios/usuarios';

const page = (items: UsuarioDetalle[], total = items.length, pagina = 1): UserPage => ({
  items,
  total,
  pagina,
  porPagina: 20,
});

const accounts = [
  testAccount({
    id: 11,
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
  }),
  testAccount({
    id: 12,
    rol: 'cliente',
    nombre: 'Ana',
    apellido: 'Gómez',
    activo: false,
    cliente: {
      tipoPersona: 'fisica',
      dni: '30123456',
      cuit: null,
      razonSocial: null,
      telefono: null,
      domicilio: null,
    },
  }),
  testAccount({
    id: 13,
    rol: 'abogado',
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@estudio.com',
  }),
];

async function openList(options: { rol?: Rol; listUsers?: () => Promise<UserPage> } = {}) {
  const users = fakeUsersService({
    listUsers: vi.fn(options.listUsers ?? (async () => page(accounts))),
  });
  renderApp(
    '/panel/usuarios',
    fakeSessionService({
      fetchOwnUser: vi.fn().mockResolvedValue(testUser(options.rol ?? 'admin')),
    }),
    { users },
  );
  await screen.findByRole('heading', { name: 'Cuentas' });
  return users;
}

const lastQuery = (users: ReturnType<typeof fakeUsersService>) =>
  users.listUsers.mock.calls.at(-1)?.[0];

describe('PanelUsuarios (RF-26)', () => {
  it('al abrir, carga la primera página y muestra las cuentas', async () => {
    const users = await openList();

    const table = await screen.findByRole('table');
    expect(lastQuery(users)).toEqual({ pagina: 1 });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      'Acme SRL',
      'Gómez, Ana',
      'Pérez, Juan',
    ]);
    expect(within(rows[0]).getByText('30-71234567-1')).toBeTruthy();
    expect(within(rows[1]).getByText('30.123.456')).toBeTruthy();
    expect(within(rows[1]).getByText('Desactivada')).toBeTruthy();
    expect(within(rows[2]).getByText('Abogado')).toBeTruthy();
  });

  it('cada cuenta lleva a su detalle', async () => {
    await openList();

    await userEvent.setup().click(await screen.findByRole('link', { name: 'Acme SRL' }));

    expect(await screen.findByRole('heading', { name: 'Detalle de la cuenta' })).toBeTruthy();
  });

  it('busca con el texto escrito', async () => {
    const users = await openList();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Buscar'), 'pérez 30.123');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await vi.waitFor(() => expect(lastQuery(users)).toEqual({ pagina: 1, buscar: 'pérez 30.123' }));
  });

  it('filtra por rol y por estado, volviendo a la primera página', async () => {
    const users = await openList({ listUsers: async () => page(accounts, 45) });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
    await vi.waitFor(() => expect(lastQuery(users)).toEqual({ pagina: 2 }));

    await user.selectOptions(screen.getByLabelText('Rol'), 'abogado');
    await vi.waitFor(() => expect(lastQuery(users)).toEqual({ pagina: 1, rol: 'abogado' }));

    await user.selectOptions(screen.getByLabelText('Estado'), 'false');
    await vi.waitFor(() =>
      expect(lastQuery(users)).toEqual({ pagina: 1, rol: 'abogado', activo: false }),
    );
  });

  it('pagina de a 20', async () => {
    const users = await openList({ listUsers: async () => page(accounts, 45) });
    const user = userEvent.setup();

    expect(await screen.findByText('Página 1 de 3 · 45 cuentas')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    await vi.waitFor(() => expect(lastQuery(users)).toEqual({ pagina: 2 }));
  });

  it('un abogado no ve el filtro de roles, pero sí el de estado', async () => {
    await openList({ rol: 'abogado' });

    await screen.findByRole('table');
    expect(screen.queryByLabelText('Rol')).toBeNull();
    expect(screen.getByLabelText('Estado')).toBeTruthy();
  });

  it('avisa cuando no hay resultados', async () => {
    await openList({ listUsers: async () => page([]) });

    expect(await screen.findByText('No hay cuentas que coincidan.')).toBeTruthy();
  });

  it('muestra el error de la API', async () => {
    await openList({
      listUsers: async () => {
        throw new ApiError(403, ['No tenés permiso para realizar esta acción']);
      },
    });

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No tenés permiso para realizar esta acción',
    );
  });

  it('ofrece crear una cuenta nueva', async () => {
    await openList();

    await userEvent.setup().click(screen.getByRole('link', { name: 'Nueva cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Nueva cuenta' })).toBeTruthy();
  });
});
