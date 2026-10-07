import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_MOVEMENT_FILTERS } from '../servicios/formulario-movimiento';
import { FiltrosMovimientos } from './FiltrosMovimientos';

function renderFilters() {
  const onChange = vi.fn();
  render(<FiltrosMovimientos value={EMPTY_MOVEMENT_FILTERS} onChange={onChange} />);
  return onChange;
}

describe('FiltrosMovimientos (RF-25 a RF-27)', () => {
  it('devuelve el tipo, la visibilidad y "Ocultar anulados" al cambiarlos', async () => {
    const onChange = renderFilters();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText('Tipo'), 'audiencia');
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_MOVEMENT_FILTERS, tipo: 'audiencia' });

    await user.selectOptions(screen.getByLabelText('Visibilidad'), 'ocultos');
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_MOVEMENT_FILTERS,
      tipo: 'audiencia',
      visibilidad: 'ocultos',
    });

    await user.click(screen.getByLabelText('Ocultar anulados'));
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_MOVEMENT_FILTERS,
      tipo: 'audiencia',
      visibilidad: 'ocultos',
      ocultarAnulados: true,
    });
  });

  it('aplica el buscador al enviarlo, no mientras se escribe', async () => {
    const onChange = renderFilters();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Buscar'), 'cédula');
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_MOVEMENT_FILTERS, buscar: 'cédula' });
  });

  it('devuelve el rango de fechas', () => {
    const onChange = renderFilters();

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2024-01-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2024-12-31' } });

    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_MOVEMENT_FILTERS,
      desde: '2024-01-01',
      hasta: '2024-12-31',
    });
  });

  it('con desde > hasta muestra el error y no aplica el cambio (RF-26)', () => {
    const onChange = renderFilters();

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2024-05-01' } });
    onChange.mockClear();
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2024-04-01' } });

    expect(screen.getByRole('alert').textContent).toContain(
      'La fecha desde no puede ser posterior a la fecha hasta',
    );
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2024-06-01' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
