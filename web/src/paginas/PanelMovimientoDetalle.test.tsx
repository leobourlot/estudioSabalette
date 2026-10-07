import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProveedorServicios } from '../componentes/ProveedorServicios';
import {
  fakeMovimientosService,
  type FakeMovimientosService,
  testMovimientoDetalle,
} from '../pruebas/movimientos-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { MovimientoDetalle } from '../servicios/movimientos';
import { PanelMovimientoDetalle } from './PanelMovimientoDetalle';

const detail = (overrides: Partial<MovimientoDetalle> = {}) =>
  testMovimientoDetalle({
    id: 12,
    causaId: 7,
    fecha: '2024-03-01',
    tipo: 'resolucion',
    descripcion: 'Se hace lugar a la medida cautelar.',
    textoCliente: 'El juez aceptó la medida que pedimos.',
    textoVisible: 'El juez aceptó la medida que pedimos.',
    origenTextoVisible: 'textoCliente',
    visible: true,
    tieneTextoCliente: true,
    creadoEn: '2026-10-01T13:00:00.000Z',
    ...overrides,
  });

async function openDetail(
  movimiento: MovimientoDetalle = detail(),
  overrides: Partial<FakeMovimientosService> = {},
) {
  const movimientos = fakeMovimientosService({
    getMovement: vi.fn().mockResolvedValue(movimiento),
    ...overrides,
  });
  render(
    <MemoryRouter initialEntries={['/panel/causas/7/movimientos/12']}>
      <ProveedorServicios services={{ movimientos }}>
        <Routes>
          <Route
            path="/panel/causas/:id/movimientos/:movimientoId"
            element={<PanelMovimientoDetalle />}
          />
        </Routes>
      </ProveedorServicios>
    </MemoryRouter>,
  );
  await screen.findByRole('region', { name: 'Datos del movimiento' });
  return { movimientos, user: userEvent.setup() };
}

const dataSection = () => screen.getByRole('region', { name: 'Datos del movimiento' });
const clientSection = () => screen.getByRole('region', { name: 'Lo que ve el cliente' });

describe('PanelMovimientoDetalle (RF-11, RF-15 a RF-19, RF-22, RF-28)', () => {
  it('pide el movimiento de la causa y muestra sus datos', async () => {
    const { movimientos } = await openDetail();
    const data = within(dataSection());

    expect(movimientos.getMovement).toHaveBeenCalledWith(7, 12);
    expect(screen.getByRole('heading', { name: 'Movimiento', level: 1 })).toBeTruthy();
    expect(data.getByText('01/03/2024')).toBeTruthy();
    expect(data.getByText('Resolución')).toBeTruthy();
    expect(data.getByText('Sí')).toBeTruthy();
    expect(data.getByText('Se hace lugar a la medida cautelar.')).toBeTruthy();
    expect(data.getByText('El juez aceptó la medida que pedimos.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Volver a la causa' }).getAttribute('href')).toBe(
      '/panel/causas/7',
    );
  });

  it('muestra el texto que ve el cliente con su origen (RF-7, RF-22)', async () => {
    await openDetail();

    expect(clientSection().textContent).toContain(
      'El cliente ve este movimiento con el texto para el cliente:',
    );
    expect(within(clientSection()).getByText('El juez aceptó la medida que pedimos.')).toBeTruthy();
  });

  it('en un movimiento oculto sin texto para el cliente, avisa que vería la descripción', async () => {
    await openDetail(
      detail({
        visible: false,
        textoCliente: null,
        textoVisible: 'Se hace lugar a la medida cautelar.',
        origenTextoVisible: 'descripcion',
      }),
    );

    expect(clientSection().textContent).toContain(
      'El cliente no ve este movimiento. Si se lo hace visible, verá la descripción (no hay texto para el cliente):',
    );
  });

  it('muestra el historial de cambios y el registro (RF-22)', async () => {
    await openDetail();

    expect(screen.getByRole('list', { name: 'Historial de cambios' })).toBeTruthy();
    expect(screen.getByText('Cargado por Sosa, Luis el 01/10/2026 10:00')).toBeTruthy();
    expect(screen.getByText('Sin modificaciones desde la carga')).toBeTruthy();
  });

  it('edita el movimiento enviando solo lo que cambió y muestra el resultado (RF-11)', async () => {
    const updateMovement = vi.fn().mockResolvedValue(detail({ tipo: 'sentencia' }));
    const { user } = await openDetail(detail(), { updateMovement });

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.selectOptions(screen.getByLabelText('Tipo'), 'sentencia');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(updateMovement).toHaveBeenCalledWith(7, 12, { tipo: 'sentencia' });
    expect(await within(dataSection()).findByText('Sentencia')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
  });

  it('al editar un movimiento visible avisa que el cambio se verá en el portal (RF-13)', async () => {
    const { user } = await openDetail();

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.type(screen.getByLabelText('Descripción'), ' Firme.');

    expect(
      screen.getByText(
        'Este movimiento es visible para el cliente; el cambio se verá en el portal',
      ),
    ).toBeTruthy();
  });

  it('anula con confirmación (RF-16)', async () => {
    const annulMovement = vi.fn().mockResolvedValue(detail({ anulado: true }));
    const { user } = await openDetail(detail(), { annulMovement });

    await user.click(screen.getByRole('button', { name: 'Anular' }));
    const dialog = screen.getByRole('alertdialog', { name: '¿Anular este movimiento?' });
    await user.click(within(dialog).getByRole('button', { name: 'Sí, anular' }));

    expect(annulMovement).toHaveBeenCalledWith(7, 12);
    expect(await screen.findByText('Anulado')).toBeTruthy();
  });

  it('un movimiento anulado no ofrece "Editar" y sí "Restaurar" (RF-15, RF-18)', async () => {
    const restoreMovement = vi.fn().mockResolvedValue(detail({ anulado: false }));
    const { user } = await openDetail(detail({ anulado: true }), { restoreMovement });

    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull();
    expect(clientSection().textContent).toContain('marcado como anulado');

    await user.click(screen.getByRole('button', { name: 'Restaurar' }));

    expect(restoreMovement).toHaveBeenCalledWith(7, 12);
    expect(await screen.findByRole('button', { name: 'Editar' })).toBeTruthy();
  });

  it('muestra los mensajes de 409 al anular o restaurar (RF-19)', async () => {
    const restoreMovement = vi
      .fn()
      .mockRejectedValue(new ApiError(409, ['El movimiento no está anulado']));
    const { user } = await openDetail(detail({ anulado: true }), { restoreMovement });

    await user.click(screen.getByRole('button', { name: 'Restaurar' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'El movimiento no está anulado',
    );
  });

  it('en una causa desactivada no ofrece acciones (RF-28)', async () => {
    await openDetail(detail({ causaActiva: false }));

    expect(
      screen.getByText('La causa está desactivada: sus movimientos solo se pueden consultar.'),
    ).toBeTruthy();
    for (const name of ['Editar', 'Anular', 'Restaurar']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('muestra el error si no se puede cargar el movimiento', async () => {
    const movimientos = fakeMovimientosService({
      getMovement: vi.fn().mockRejectedValue(new ApiError(404, ['No existe ese movimiento'])),
    });
    render(
      <MemoryRouter initialEntries={['/panel/causas/7/movimientos/12']}>
        <ProveedorServicios services={{ movimientos }}>
          <Routes>
            <Route
              path="/panel/causas/:id/movimientos/:movimientoId"
              element={<PanelMovimientoDetalle />}
            />
          </Routes>
        </ProveedorServicios>
      </MemoryRouter>,
    );

    expect((await screen.findByRole('alert')).textContent).toBe('No existe ese movimiento');
  });
});
