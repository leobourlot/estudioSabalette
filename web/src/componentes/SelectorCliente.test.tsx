import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeUsersService, testAccount } from '../pruebas/aplicacion-de-prueba';
import type { UserPage } from '../servicios/usuarios';
import { ProveedorServicios } from './ProveedorServicios';
import { SelectorCliente } from './SelectorCliente';

const ana = testAccount({
  id: 12,
  rol: 'cliente',
  nombre: 'Ana',
  apellido: 'Gómez',
  cliente: {
    tipoPersona: 'fisica',
    dni: '30123456',
    cuit: null,
    razonSocial: null,
    telefono: null,
    domicilio: null,
  },
});
const company = testAccount({
  id: 13,
  rol: 'cliente',
  nombre: 'Laura',
  apellido: 'Contacto',
  cliente: {
    tipoPersona: 'juridica',
    dni: null,
    cuit: '30712345671',
    razonSocial: 'Gómez S.A.',
    telefono: null,
    domicilio: null,
  },
});

function renderSelector(items = [ana, company], onChoose = vi.fn()) {
  const page: UserPage = { items, total: items.length, pagina: 1, porPagina: 20 };
  const users = fakeUsersService({ listUsers: vi.fn().mockResolvedValue(page) });
  render(
    <ProveedorServicios services={{ users }}>
      <SelectorCliente onChoose={onChoose} />
    </ProveedorServicios>,
  );
  return { users, onChoose };
}

describe('SelectorCliente (RF-14)', () => {
  it('busca solo clientes activos y muestra su DNI o CUIT para distinguirlos', async () => {
    const { users } = renderSelector();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Buscar cliente'), 'gómez');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(users.listUsers).toHaveBeenCalledWith({ rol: 'cliente', activo: true, buscar: 'gómez' });
    expect(await screen.findByRole('button', { name: 'Gómez, Ana · DNI 30.123.456' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gómez S.A. · CUIT 30-71234567-1' })).toBeTruthy();
  });

  it('Enter en el buscador busca sin enviar el formulario que lo contiene', async () => {
    const submit = vi.fn((event: Event) => event.preventDefault());
    const page: UserPage = { items: [ana], total: 1, pagina: 1, porPagina: 20 };
    const users = fakeUsersService({ listUsers: vi.fn().mockResolvedValue(page) });
    render(
      <ProveedorServicios services={{ users }}>
        <form onSubmit={(event) => submit(event.nativeEvent)}>
          <SelectorCliente onChoose={vi.fn()} />
        </form>
      </ProveedorServicios>,
    );

    await userEvent.setup().type(screen.getByLabelText('Buscar cliente'), 'ana{Enter}');

    expect(users.listUsers).toHaveBeenCalledWith({ rol: 'cliente', activo: true, buscar: 'ana' });
    expect(submit).not.toHaveBeenCalled();
  });

  it('elegir un cliente avisa su id y su nombre', async () => {
    const { onChoose } = renderSelector();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.click(await screen.findByRole('button', { name: 'Gómez, Ana · DNI 30.123.456' }));

    expect(onChoose).toHaveBeenCalledWith(12, 'Gómez, Ana · DNI 30.123.456');
  });

  it('avisa si no hay clientes que coincidan', async () => {
    renderSelector([]);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('No hay clientes activos que coincidan.')).toBeTruthy();
  });
});
