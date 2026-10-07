import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fakeMovimientosService,
  type FakeMovimientosService,
  movementPage,
  testMovimientoDetalle,
  testMovimientoResumen,
} from '../pruebas/movimientos-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import { HistorialMovimientos } from './HistorialMovimientos';
import { ProveedorServicios } from './ProveedorServicios';

async function renderHistory(
  movimientos: FakeMovimientosService = fakeMovimientosService(),
  causaActiva = true,
) {
  render(
    <MemoryRouter>
      <ProveedorServicios services={{ movimientos }}>
        <HistorialMovimientos causaId={7} causaActiva={causaActiva} />
      </ProveedorServicios>
    </MemoryRouter>,
  );
  await vi.waitFor(() => expect(movimientos.listMovements).toHaveBeenCalled());
  return { movimientos, user: userEvent.setup() };
}

const lastQuery = (movimientos: FakeMovimientosService) =>
  movimientos.listMovements.mock.calls.at(-1)![1];

describe('HistorialMovimientos (RF-8, RF-23 a RF-28)', () => {
  const storage = { local: 0, session: 0 };

  beforeEach(() => {
    storage.local = 0;
    storage.session = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage) {
      if (this === window.localStorage) storage.local += 1;
      else storage.session += 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Principio 5: nada del flujo de movimientos se guarda en el navegador.
    expect(storage).toEqual({ local: 0, session: 0 });
  });

  it('pide la primera página sin filtros y muestra los movimientos', async () => {
    const movimientos = fakeMovimientosService({
      listMovements: vi
        .fn()
        .mockResolvedValue(
          movementPage([
            testMovimientoResumen({ id: 1 }),
            testMovimientoResumen({ id: 2, tipo: 'oficio' }),
          ]),
        ),
    });
    await renderHistory(movimientos);

    expect(movimientos.listMovements).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ pagina: 1 }),
    );
    const list = await screen.findByRole('list', { name: 'Lista de movimientos' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Página 1 de 1 · 2 movimientos')).toBeTruthy();
  });

  it('sin movimientos lo indica', async () => {
    await renderHistory();

    expect(await screen.findByText('Todavía no hay movimientos.')).toBeTruthy();
  });

  it('buscar y cada filtro llaman al servicio con sus parámetros y vuelven a la página 1', async () => {
    const movimientos = fakeMovimientosService({
      listMovements: vi.fn().mockResolvedValue(movementPage([testMovimientoResumen()], 45)),
    });
    const { user } = await renderHistory(movimientos);
    await user.click(await screen.findByRole('button', { name: 'Siguiente' }));
    await vi.waitFor(() => expect(lastQuery(movimientos)).toMatchObject({ pagina: 2 }));

    await user.selectOptions(screen.getByLabelText('Tipo'), 'audiencia');
    await vi.waitFor(() =>
      expect(lastQuery(movimientos)).toMatchObject({ pagina: 1, tipo: 'audiencia' }),
    );

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.selectOptions(screen.getByLabelText('Visibilidad'), 'visibles');
    await vi.waitFor(() =>
      expect(lastQuery(movimientos)).toMatchObject({ pagina: 1, visibilidad: 'visibles' }),
    );

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2024-01-01' } });
    await user.click(screen.getByLabelText('Ocultar anulados'));
    await user.type(screen.getByLabelText('Buscar'), 'cédula');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await vi.waitFor(() =>
      expect(lastQuery(movimientos)).toEqual({
        pagina: 1,
        buscar: 'cédula',
        tipo: 'audiencia',
        visibilidad: 'visibles',
        desde: '2024-01-01',
        hasta: '',
        ocultarAnulados: true,
      }),
    );
  });

  it('pagina con "Anterior" y "Siguiente"', async () => {
    const movimientos = fakeMovimientosService({
      listMovements: vi.fn().mockResolvedValue(movementPage([testMovimientoResumen()], 45)),
    });
    const { user } = await renderHistory(movimientos);

    expect(await screen.findByText('Página 1 de 3 · 45 movimientos')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Anterior' }).disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('Página 2 de 3 · 45 movimientos')).toBeTruthy();
  });

  it('con filtros y sin resultados lo indica', async () => {
    const { user } = await renderHistory();

    await user.selectOptions(screen.getByLabelText('Tipo'), 'pericia');

    expect(await screen.findByText('No hay movimientos que coincidan.')).toBeTruthy();
  });

  it('carga un movimiento y recarga el historial desde la primera página (RF-8)', async () => {
    const movimientos = fakeMovimientosService({
      createMovement: vi.fn().mockResolvedValue(testMovimientoDetalle()),
    });
    const { user } = await renderHistory(movimientos);
    const calls = movimientos.listMovements.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Nuevo movimiento' }));
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2024-05-10' } });
    await user.selectOptions(screen.getAllByLabelText('Tipo')[0], 'audiencia');
    await user.type(screen.getByLabelText('Descripción'), 'Audiencia preliminar.');
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));

    expect(movimientos.createMovement).toHaveBeenCalledWith(7, {
      fecha: '2024-05-10',
      tipo: 'audiencia',
      descripcion: 'Audiencia preliminar.',
      textoCliente: null,
      visible: false,
    });
    await vi.waitFor(() =>
      expect(movimientos.listMovements.mock.calls.length).toBeGreaterThan(calls),
    );
    expect(screen.queryByRole('button', { name: 'Guardar movimiento' })).toBeNull();
  });

  it('muestra los errores de la API al cargar', async () => {
    const movimientos = fakeMovimientosService({
      createMovement: vi.fn().mockRejectedValue(new ApiError(409, ['La causa está desactivada'])),
    });
    const { user } = await renderHistory(movimientos);

    await user.click(screen.getByRole('button', { name: 'Nuevo movimiento' }));
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2024-05-10' } });
    await user.selectOptions(screen.getAllByLabelText('Tipo')[0], 'oficio');
    await user.type(screen.getByLabelText('Descripción'), 'Oficio.');
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }));

    expect((await screen.findByRole('alert')).textContent).toContain('La causa está desactivada');
  });

  it('en una causa desactivada no ofrece "Nuevo movimiento" pero muestra el historial (RF-28)', async () => {
    const movimientos = fakeMovimientosService({
      listMovements: vi.fn().mockResolvedValue(movementPage([testMovimientoResumen()])),
    });
    await renderHistory(movimientos, false);

    expect(await screen.findByRole('list', { name: 'Lista de movimientos' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Nuevo movimiento' })).toBeNull();
  });

  it('muestra el error si no se puede cargar el historial', async () => {
    const movimientos = fakeMovimientosService({
      listMovements: vi.fn().mockRejectedValue(new ApiError(404, ['No existe esa causa'])),
    });
    await renderHistory(movimientos);

    expect((await screen.findByRole('alert')).textContent).toBe('No existe esa causa');
  });
});
