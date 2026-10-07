import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  EMPTY_MOVEMENT_FORM,
  MOVEMENT_MESSAGES,
  type MovementForm,
  movementFormFrom,
} from '../servicios/formulario-movimiento';
import type { MovimientoDetalle } from '../servicios/movimientos';
import { FormularioMovimiento } from './FormularioMovimiento';

const VALID: MovementForm = {
  fecha: '2024-03-01',
  tipo: 'providencia',
  descripcion: 'Se fija audiencia preliminar.',
  textoCliente: '',
  visible: false,
};

const VISIBLE_MOVEMENT = {
  id: 7,
  fecha: '2024-03-01',
  tipo: 'providencia',
  descripcion: 'Se fija audiencia preliminar.',
  textoCliente: null,
  visible: true,
} as MovimientoDetalle;

const WARNING = 'Este movimiento es visible para el cliente; el cambio se verá en el portal';

/** Formulario controlado con su propio estado, como lo usan las páginas. */
function Harness({
  initial = EMPTY_MOVEMENT_FORM,
  original,
  onSubmit,
  apiProblems = [],
}: {
  initial?: MovementForm;
  original?: MovimientoDetalle;
  onSubmit: (form: MovementForm) => void;
  apiProblems?: string[];
}) {
  const [form, setForm] = useState(initial);
  return (
    <FormularioMovimiento
      value={form}
      onChange={setForm}
      submitLabel="Guardar"
      onSubmit={() => onSubmit(form)}
      original={original}
      apiProblems={apiProblems}
    />
  );
}

const preview = () => screen.queryByRole('status', { name: 'Lo que verá el cliente' });

describe('FormularioMovimiento (RF-1, RF-8, RF-9, RF-11, RF-13)', () => {
  it('muestra los campos y la casilla "Visible para el cliente" desmarcada al cargar (RF-8)', () => {
    render(<Harness onSubmit={vi.fn()} />);

    for (const label of ['Fecha', 'Tipo', 'Descripción', 'Texto para el cliente (opcional)']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByLabelText<HTMLInputElement>('Visible para el cliente').checked).toBe(false);
    expect(preview()).toBeNull();
  });

  it('limita la fecha al rango de la spec (RF-5)', () => {
    render(<Harness onSubmit={vi.fn()} />);

    const fecha = screen.getByLabelText<HTMLInputElement>('Fecha');
    expect(fecha.type).toBe('date');
    expect(fecha.min).toBe('1900-01-01');
    expect(fecha.max).toBe('2099-12-31');
  });

  it('cuenta los caracteres de cada texto sobre 2.000', async () => {
    render(<Harness onSubmit={vi.fn()} />);
    expect(screen.getAllByText('0/2000')).toHaveLength(2);

    await userEvent.setup().type(screen.getByLabelText('Descripción'), 'Ñandú');

    expect(screen.getByText('5/2000')).toBeTruthy();
  });

  it('muestra los errores antes de enviar y no envía', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar' }));

    const alert = screen.getByRole('alert');
    for (const message of [
      MOVEMENT_MESSAGES.fechaRequired,
      MOVEMENT_MESSAGES.tipo,
      MOVEMENT_MESSAGES.descripcionRequired,
    ]) {
      expect(alert.textContent).toContain(message);
    }
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía los datos elegidos', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const user = userEvent.setup();

    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2024-05-10' } });
    await user.selectOptions(screen.getByLabelText('Tipo'), 'audiencia');
    await user.type(screen.getByLabelText('Descripción'), 'Audiencia preliminar.');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onSubmit).toHaveBeenCalledWith({
      fecha: '2024-05-10',
      tipo: 'audiencia',
      descripcion: 'Audiencia preliminar.',
      textoCliente: '',
      visible: false,
    });
  });

  it('al marcarlo visible, avisa qué verá el cliente y de dónde sale el texto (RF-9)', async () => {
    render(<Harness initial={VALID} onSubmit={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Visible para el cliente'));
    expect(preview()!.textContent).toContain(
      'El cliente verá (descripción (no hay texto para el cliente))',
    );
    expect(preview()!.textContent).toContain('Se fija audiencia preliminar.');

    await user.type(
      screen.getByLabelText('Texto para el cliente (opcional)'),
      'El juez fijó audiencia.',
    );
    expect(preview()!.textContent).toContain('El cliente verá (texto para el cliente)');
    expect(preview()!.textContent).toContain('El juez fijó audiencia.');
    expect(preview()!.textContent).not.toContain('Se fija audiencia preliminar.');
  });

  it('en la edición de un movimiento visible, avisa si cambia lo que ve el cliente (RF-13)', async () => {
    render(
      <Harness
        initial={movementFormFrom(VISIBLE_MOVEMENT)}
        original={VISIBLE_MOVEMENT}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByText(WARNING)).toBeNull();

    await userEvent.setup().type(screen.getByLabelText('Descripción'), ' Para el 12/11.');

    expect(screen.getByText(WARNING)).toBeTruthy();
  });

  it('ningún aviso impide guardar', async () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        initial={{ ...movementFormFrom(VISIBLE_MOVEMENT), descripcion: 'Otra descripción.' }}
        original={VISIBLE_MOVEMENT}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText(WARNING)).toBeTruthy();
    expect(preview()).toBeTruthy();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('muestra los errores de la API', () => {
    render(<Harness onSubmit={vi.fn()} apiProblems={['La causa está desactivada']} />);

    expect(screen.getByRole('alert').textContent).toContain('La causa está desactivada');
  });
});
