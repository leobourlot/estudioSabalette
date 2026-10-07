import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { MovimientoResumen } from '../servicios/movimientos';
import { FilaMovimiento } from './FilaMovimiento';

const MOVEMENT: MovimientoResumen = {
  id: 12,
  fecha: '2024-03-01',
  tipo: 'resolucion',
  descripcion: 'Se hace lugar a la medida cautelar.',
  visible: true,
  tieneTextoCliente: true,
  anulado: false,
  esFechaFutura: false,
  creadoPor: { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true },
  creadoEn: '2026-10-01T15:00:00.000Z',
};

function renderRow(overrides: Partial<MovimientoResumen> = {}) {
  render(
    <MemoryRouter>
      <ul>
        <FilaMovimiento movimiento={{ ...MOVEMENT, ...overrides }} causaId={3} />
      </ul>
    </MemoryRouter>,
  );
  return screen.getByRole('listitem');
}

describe('FilaMovimiento (RF-24, RF-36)', () => {
  it('muestra fecha, tipo, descripción, visibilidad, texto para el cliente y autor', () => {
    const row = renderRow();

    expect(row.getAttribute('aria-label')).toBe('01/03/2024 Resolución');
    for (const text of [
      '01/03/2024',
      'Resolución',
      'Se hace lugar a la medida cautelar.',
      'Visible',
      'Con texto para el cliente',
      'Cargado por Sosa, Luis',
    ]) {
      expect(within(row).getByText(text)).toBeTruthy();
    }
    expect(within(row).queryByText('Anulado')).toBeNull();
    expect(within(row).queryByText('Fecha futura')).toBeNull();
    expect(within(row).queryByRole('button', { name: 'Ver completa' })).toBeNull();
  });

  it('marca un movimiento oculto sin texto para el cliente', () => {
    const row = renderRow({ visible: false, tieneTextoCliente: false });

    expect(within(row).getByText('Oculto')).toBeTruthy();
    expect(within(row).queryByText('Visible')).toBeNull();
    expect(within(row).queryByText('Con texto para el cliente')).toBeNull();
  });

  it('muestra las etiquetas "Anulado" y "Fecha futura"', () => {
    const row = renderRow({ anulado: true, esFechaFutura: true });

    expect(within(row).getByText('Anulado')).toBeTruthy();
    expect(within(row).getByText('Fecha futura')).toBeTruthy();
  });

  it('marca al autor desactivado', () => {
    const row = renderRow({ creadoPor: { ...MOVEMENT.creadoPor, activo: false } });

    expect(within(row).getByText('Cargado por Sosa, Luis (desactivado)')).toBeTruthy();
  });

  it('recorta una descripción larga y permite verla completa', async () => {
    const descripcion = `${'Texto largo. '.repeat(20)}Final del texto.`;
    const row = renderRow({ descripcion });
    expect(within(row).queryByText(/Final del texto\./)).toBeNull();

    await userEvent.setup().click(within(row).getByRole('button', { name: 'Ver completa' }));

    expect(within(row).getByText(/Final del texto\./)).toBeTruthy();
    expect(within(row).getByRole('button', { name: 'Ver menos' })).toBeTruthy();
  });

  it('enlaza al detalle del movimiento', () => {
    const row = renderRow();

    expect(within(row).getByRole('link', { name: 'Ver detalle' }).getAttribute('href')).toBe(
      '/panel/causas/3/movimientos/12',
    );
  });
});
