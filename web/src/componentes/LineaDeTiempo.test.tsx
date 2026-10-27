import { render, screen, within } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { testMovimientoCliente } from '../pruebas/portal-de-prueba';
import type { MovimientoCliente } from '../servicios/portal';
import { LineaDeTiempo } from './LineaDeTiempo';

function renderTimeline(movimientos: MovimientoCliente[]) {
  return render(
    <MemoryRouter>
      <LazyMotion features={domAnimation}>
        <LineaDeTiempo
          movimientos={movimientos}
          hrefFor={(m) => `/portal/causas/7/movimientos/${m.id}`}
        />
      </LazyMotion>
    </MemoryRouter>,
  );
}

const items = () => within(screen.getByRole('list')).getAllByRole('listitem');

describe('LineaDeTiempo (spec 008, RF-18 y RF-19)', () => {
  it('muestra un elemento por movimiento, en el orden recibido, con su fecha, su tipo y su texto', () => {
    renderTimeline([
      testMovimientoCliente({ id: 1, fecha: '2026-09-30', tipo: 'audiencia', texto: 'Primero.' }),
      testMovimientoCliente({ id: 2, fecha: '2026-08-01', tipo: 'sentencia', texto: 'Segundo.' }),
    ]);

    const [first, second] = items();
    expect(items()).toHaveLength(2);
    expect(within(first).getByText('30/09/2026')).toBeTruthy();
    expect(within(first).getByText('Audiencia')).toBeTruthy();
    expect(within(first).getByText('Primero.')).toBeTruthy();
    expect(within(second).getByText('01/08/2026')).toBeTruthy();
    expect(within(second).getByRole('link', { name: 'Abrir' }).getAttribute('href')).toBe(
      '/portal/causas/7/movimientos/2',
    );
  });

  it('cada movimiento tiene un punto y una línea que no se anuncian, y una división con el siguiente', () => {
    renderTimeline([testMovimientoCliente({ id: 1 }), testMovimientoCliente({ id: 2 })]);

    for (const item of items()) {
      const dot = item.querySelector('[data-punto]')!;
      const line = item.querySelector('[data-linea]')!;
      expect(dot.getAttribute('aria-hidden')).toBe('true');
      expect(line.getAttribute('aria-hidden')).toBe('true');
      expect(item.querySelector('article')!.parentElement!.className).toContain('border-b');
    }
  });

  it('el último movimiento no lleva línea hacia abajo ni división', () => {
    renderTimeline([testMovimientoCliente({ id: 1 })]);

    const [only] = items();
    expect(only.querySelector('[data-linea]')!.className).toContain('group-last:hidden');
    expect(only.querySelector('article')!.parentElement!.className).toContain(
      'group-last:border-b-0',
    );
  });

  it('todos los puntos van llenos y ningún texto va tachado (RF-19)', () => {
    renderTimeline([testMovimientoCliente({ id: 1 }), testMovimientoCliente({ id: 2 })]);

    for (const item of items()) {
      expect(item.querySelector('[data-punto]')!.className).toContain('bg-estudio-oscuro');
      expect(item.querySelector('.line-through')).toBeNull();
    }
  });
});
