import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeUsersService } from '../pruebas/aplicacion-de-prueba';
import { fakeCausasService, testCausaDetalle, testParte } from '../pruebas/causas-de-prueba';
import type { CausaDetalle, CausasService, ResultadoParte } from '../servicios/causas';
import { ApiError } from '../servicios/cliente-http';
import { ProveedorServicios } from './ProveedorServicios';
import { TablaPartes } from './TablaPartes';

const pedro = testParte({
  id: 1,
  rol: 'actor',
  nombre: 'Pedro',
  apellido: 'López',
  dni: '20111222',
});
const ana = testParte({
  id: 2,
  rol: 'demandado',
  esCliente: true,
  clienteId: 12,
  clienteActivo: true,
  nombre: 'Ana',
  apellido: 'Gómez',
  dni: '30123456',
});
const marta = testParte({ id: 3, rol: 'tercero', nombre: 'Marta', apellido: 'Ruiz' });

const causaWith = (overrides: Partial<CausaDetalle> = {}) =>
  testCausaDetalle({ id: 7, partes: [pedro, ana], partesDesvinculadas: [marta], ...overrides });

const result = (overrides: Partial<ResultadoParte> = {}): ResultadoParte => ({
  causa: causaWith(),
  causasComoNoCliente: [],
  ...overrides,
});

const question = (message: string, details: Record<string, unknown>) =>
  new ApiError(409, [message], details);

function renderTable(causa = causaWith(), overrides: Partial<CausasService> = {}) {
  const causas = fakeCausasService(overrides);
  const onChanged = vi.fn();
  render(
    <ProveedorServicios services={{ causas, users: fakeUsersService() }}>
      <TablaPartes causa={causa} onChanged={onChanged} />
    </ProveedorServicios>,
  );
  return { causas, onChanged, user: userEvent.setup() };
}

const activeRow = (name: string) =>
  within(screen.getByRole('table', { name: 'Partes vigentes' })).getByRole('row', {
    name: new RegExp(name),
  });

describe('TablaPartes (RF-12 a RF-25)', () => {
  it('lista las partes vigentes con su rol y documento, y aparte las desvinculadas', () => {
    renderTable(causaWith({ partes: [pedro, { ...ana, clienteActivo: false }] }));

    expect(within(activeRow('Pedro López')).getByText('Actor')).toBeTruthy();
    expect(within(activeRow('Pedro López')).getByText('DNI 20.111.222')).toBeTruthy();
    expect(within(activeRow('Ana Gómez')).getByText('Cliente (desactivado)')).toBeTruthy();
    const unlinked = screen.getByRole('table', { name: 'Partes desvinculadas' });
    expect(within(unlinked).getByText('Marta Ruiz')).toBeTruthy();
  });

  it('desvincula una parte (RF-22)', async () => {
    const updated = causaWith({ partes: [ana], partesDesvinculadas: [marta, pedro] });
    const { causas, onChanged, user } = renderTable(causaWith(), {
      unlinkParty: vi.fn().mockResolvedValue(updated),
    });

    await user.click(within(activeRow('Pedro López')).getByRole('button', { name: 'Desvincular' }));

    expect(causas.unlinkParty).toHaveBeenCalledWith(7, 1);
    expect(onChanged).toHaveBeenCalledWith(updated);
  });

  it('muestra el mensaje al intentar desvincular la última parte (RF-23)', async () => {
    const { user } = renderTable(causaWith({ partes: [pedro] }), {
      unlinkParty: vi
        .fn()
        .mockRejectedValue(new ApiError(409, ['La causa debe tener al menos una parte'])),
    });

    await user.click(screen.getByRole('button', { name: 'Desvincular' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'La causa debe tener al menos una parte',
    );
  });

  it('vuelve a vincular una parte desvinculada y avisa las causas como no cliente (RF-20, RF-24)', async () => {
    const response = result({
      causasComoNoCliente: [{ id: 3, caratula: 'López c/ Gómez', numeroExpediente: null }],
    });
    const { causas, onChanged, user } = renderTable(causaWith(), {
      relinkParty: vi.fn().mockResolvedValue(response),
    });

    await user.click(screen.getByRole('button', { name: 'Volver a vincular' }));

    expect(causas.relinkParty).toHaveBeenCalledWith(7, 3);
    expect(onChanged).toHaveBeenCalledWith(response.causa, {
      rechazos: [],
      causasComoNoCliente: response.causasComoNoCliente,
    });
  });

  describe('agregar (RF-13 a RF-20)', () => {
    async function openAddForm(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Agregar parte' }));
      await user.click(screen.getByLabelText('No es cliente'));
      await user.type(screen.getByLabelText('Nombre'), 'Rita');
      await user.type(screen.getByLabelText('Apellido'), 'Paz');
      await user.click(screen.getByRole('button', { name: 'Guardar parte' }));
    }

    it('agrega una parte y cierra el formulario', async () => {
      const response = result();
      const { causas, onChanged, user } = renderTable(causaWith(), {
        addParty: vi.fn().mockResolvedValue(response),
      });

      await openAddForm(user);

      expect(causas.addParty).toHaveBeenCalledWith(7, {
        rol: 'actor',
        tipoPersona: 'fisica',
        nombre: 'Rita',
        apellido: 'Paz',
      });
      expect(onChanged).toHaveBeenCalledWith(response.causa, {
        rechazos: [],
        causasComoNoCliente: [],
      });
      expect(screen.queryByRole('button', { name: 'Guardar parte' })).toBeNull();
    });

    it('responde la pregunta de documento agregando la parte como cliente (RF-16)', async () => {
      const addParty = vi
        .fn()
        .mockRejectedValueOnce(
          question('Ese DNI o CUIT pertenece a un cliente del estudio', {
            codigo: 'DOCUMENTO_DE_CLIENTE',
            clienteId: 12,
            clienteActivo: true,
          }),
        )
        .mockResolvedValueOnce(result());
      const { user } = renderTable(causaWith(), { addParty });

      await openAddForm(user);
      await user.click(await screen.findByRole('button', { name: 'Agregar como cliente' }));

      expect(addParty).toHaveBeenLastCalledWith(7, { rol: 'actor', clienteId: 12 });
    });

    it('si es la misma persona, no la agrega (RF-19)', async () => {
      const addParty = vi.fn().mockRejectedValueOnce(
        question('Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?', {
          codigo: 'NOMBRE_REPETIDO',
          parteId: 1,
        }),
      );
      const { user } = renderTable(causaWith(), { addParty });

      await openAddForm(user);
      await user.click(await screen.findByRole('button', { name: 'Es la misma persona' }));

      expect(addParty).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: 'Guardar parte' })).toBeNull();
    });

    it('muestra los rechazos de la API en el formulario', async () => {
      const { user } = renderTable(causaWith(), {
        addParty: vi
          .fn()
          .mockRejectedValue(new ApiError(409, ['Esa persona ya es parte de la causa'])),
      });

      await openAddForm(user);

      expect((await screen.findByRole('alert')).textContent).toContain(
        'Esa persona ya es parte de la causa',
      );
    });
  });

  describe('modificar (RF-16, RF-21)', () => {
    it('reemplaza los datos de una parte no cliente', async () => {
      const { causas, user } = renderTable(causaWith(), {
        updateParty: vi.fn().mockResolvedValue(result()),
      });

      await user.click(within(activeRow('Pedro López')).getByRole('button', { name: 'Modificar' }));
      await user.clear(screen.getByLabelText('Nombre'));
      await user.type(screen.getByLabelText('Nombre'), 'Pedro José');
      await user.click(screen.getByRole('button', { name: 'Guardar parte' }));

      expect(causas.updateParty).toHaveBeenCalledWith(7, 1, {
        rol: 'actor',
        tipoPersona: 'fisica',
        nombre: 'Pedro José',
        apellido: 'López',
        dni: '20111222',
      });
    });

    it('de una parte cliente solo envía el rol', async () => {
      const { causas, user } = renderTable(causaWith(), {
        updateParty: vi.fn().mockResolvedValue(result()),
      });

      await user.click(within(activeRow('Ana Gómez')).getByRole('button', { name: 'Modificar' }));
      expect(screen.getByText('Cliente: Ana Gómez')).toBeTruthy();
      await user.selectOptions(screen.getByLabelText('Rol procesal'), 'tercero');
      await user.click(screen.getByRole('button', { name: 'Guardar parte' }));

      expect(causas.updateParty).toHaveBeenCalledWith(7, 2, { rol: 'tercero' });
    });

    it('si el nuevo DNI es de un cliente y se elige agregarlo como cliente, la convierte (RF-16)', async () => {
      const updateParty = vi
        .fn()
        .mockRejectedValueOnce(
          question('Ese DNI o CUIT pertenece a un cliente del estudio', {
            codigo: 'DOCUMENTO_DE_CLIENTE',
            clienteId: 15,
            clienteActivo: true,
          }),
        )
        .mockResolvedValueOnce(result());
      const { user } = renderTable(causaWith(), { updateParty });

      await user.click(within(activeRow('Pedro López')).getByRole('button', { name: 'Modificar' }));
      await user.click(screen.getByRole('button', { name: 'Guardar parte' }));
      await user.click(await screen.findByRole('button', { name: 'Agregar como cliente' }));

      expect(updateParty).toHaveBeenLastCalledWith(7, 1, { rol: 'actor', clienteId: 15 });
    });
  });

  it('en una causa desactivada no ofrece acciones (RF-41)', () => {
    renderTable(causaWith({ activa: false }));

    expect(screen.queryByRole('button')).toBeNull();
  });
});
