import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeJurisprudenciaService, testSuggestion } from '../pruebas/jurisprudencia-de-prueba';
import { EMPTY_RULING_FILTERS } from '../servicios/formulario-fallo';
import { FiltrosJurisprudencia } from './FiltrosJurisprudencia';
import { ProveedorServicios } from './ProveedorServicios';

function renderFilters() {
  const onChange = vi.fn();
  const jurisprudencia = fakeJurisprudenciaService({
    suggestKeywords: vi
      .fn()
      .mockResolvedValue([
        testSuggestion(1, 'daño moral', 12),
        testSuggestion(2, 'daño emergente', 0),
      ]),
  });
  render(
    <ProveedorServicios services={{ jurisprudencia }}>
      <FiltrosJurisprudencia value={EMPTY_RULING_FILTERS} onChange={onChange} />
    </ProveedorServicios>,
  );
  return { onChange, jurisprudencia };
}

describe('FiltrosJurisprudencia (RF-23 a RF-26)', () => {
  it('devuelve el fuero y "Mostrar desactivados" al cambiarlos', async () => {
    const { onChange } = renderFilters();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText('Fuero'), 'laboral');
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RULING_FILTERS, fuero: 'laboral' });

    await user.click(screen.getByLabelText('Mostrar desactivados'));
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_RULING_FILTERS,
      fuero: 'laboral',
      incluirDesactivados: true,
    });
  });

  it('aplica el buscador al enviarlo, no mientras se escribe', async () => {
    const { onChange } = renderFilters();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Buscar'), 'daño moral');
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_RULING_FILTERS, buscar: 'daño moral' });
  });

  it('devuelve el rango de fechas', () => {
    const { onChange } = renderFilters();

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2015-01-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2020-12-31' } });

    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_RULING_FILTERS,
      desde: '2015-01-01',
      hasta: '2020-12-31',
    });
  });

  it('las fechas se limitan al rango de la fecha de un fallo (RF-26)', () => {
    renderFilters();

    for (const label of ['Desde', 'Hasta']) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      expect(input.min).toBe('1800-01-01');
      expect(input.max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('elige palabras clave del catálogo, pidiendo las sugerencias para el filtro (RF-25)', async () => {
    const { onChange, jurisprudencia } = renderFilters();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Palabras clave'), 'da');
    await user.click(await screen.findByRole('button', { name: 'daño emergente (0)' }));

    expect(jurisprudencia.suggestKeywords).toHaveBeenCalledWith('da', 'filtro');
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_RULING_FILTERS,
      palabrasClave: [{ id: 2, texto: 'daño emergente' }],
    });
  });

  it('con una búsqueda con caracteres no permitidos muestra el error y no aplica el filtro (RF-24)', async () => {
    const { onChange } = renderFilters();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Buscar'), '<script>');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'La búsqueda tiene caracteres no permitidos',
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('con desde posterior a hasta muestra el error y no aplica el cambio (RF-26)', () => {
    const { onChange } = renderFilters();

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2020-01-02' } });
    onChange.mockClear();
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2020-01-01' } });

    expect(screen.getByRole('alert').textContent).toContain(
      'La fecha desde no puede ser posterior a la fecha hasta',
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('al corregir el error, aplica los filtros y quita el aviso', () => {
    const { onChange } = renderFilters();

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2020-01-02' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2020-01-01' } });
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2020-01-03' } });

    expect(screen.queryByRole('alert')).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY_RULING_FILTERS,
      desde: '2020-01-02',
      hasta: '2020-01-03',
    });
  });
});
