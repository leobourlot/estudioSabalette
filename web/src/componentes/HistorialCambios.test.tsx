import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CambioMovimiento } from '../servicios/movimientos';
import { HistorialCambios } from './HistorialCambios';

const LUIS = { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true };
const MARTA = { id: 2, nombre: 'Marta', apellido: 'Díaz', activo: false };

const CAMBIOS: CambioMovimiento[] = [
  {
    id: 3,
    accion: 'modificacion',
    usuario: MARTA,
    fechaHora: '2026-10-02T21:30:00.000Z',
    cambios: [
      {
        campo: 'descripcion',
        anterior: 'Se fija audiencia.',
        nuevo: 'Se fija audiencia.\n\nPara el 12/11.',
      },
      { campo: 'visible', anterior: false, nuevo: true },
    ],
  },
  {
    id: 1,
    accion: 'carga',
    usuario: LUIS,
    fechaHora: '2026-10-01T13:00:00.000Z',
    cambios: [
      { campo: 'fecha', anterior: null, nuevo: '2024-03-01' },
      { campo: 'tipo', anterior: null, nuevo: 'providencia' },
      { campo: 'textoCliente', anterior: null, nuevo: null },
    ],
  },
];

describe('HistorialCambios (RF-22, RF-36)', () => {
  it('muestra cada cambio con fecha y hora de Buenos Aires, acción y autor, en el orden recibido', () => {
    render(<HistorialCambios cambios={CAMBIOS} />);

    const items = within(screen.getByRole('list', { name: 'Historial de cambios' })).getAllByRole(
      'listitem',
    );
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual([
      '02/10/2026 18:30 · Modificación · Díaz, Marta (desactivado)',
      '01/10/2026 10:00 · Carga · Sosa, Luis',
    ]);
  });

  it('en una modificación muestra el valor anterior y el nuevo de cada dato', () => {
    render(<HistorialCambios cambios={CAMBIOS} />);
    const change = screen.getByRole('listitem', { name: /Modificación/ });

    expect(within(change).getByText('Descripción')).toBeTruthy();
    expect(within(change).getAllByText('Antes')).toHaveLength(2);
    expect(within(change).getByText('Se fija audiencia.')).toBeTruthy();
    // El texto completo, con sus líneas en blanco, tal como se cargó.
    const nuevo = within(change).getByText(/Para el 12\/11\./);
    expect(nuevo.textContent).toBe('Se fija audiencia.\n\nPara el 12/11.');
    expect(nuevo.className).toContain('whitespace-pre-wrap');
    expect(within(change).getByText('Visible para el cliente')).toBeTruthy();
    expect(within(change).getByText('No')).toBeTruthy();
    expect(within(change).getByText('Sí')).toBeTruthy();
  });

  it('en la carga muestra los valores iniciales formateados', () => {
    render(<HistorialCambios cambios={CAMBIOS} />);
    const load = screen.getByRole('listitem', { name: /Carga/ });

    expect(within(load).queryByText('Antes')).toBeNull();
    expect(within(load).getByText('01/03/2024')).toBeTruthy();
    expect(within(load).getByText('Providencia')).toBeTruthy();
    expect(within(load).getByText('—')).toBeTruthy();
  });
});
