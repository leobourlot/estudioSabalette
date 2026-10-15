import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SeccionSesion } from '../servicios/estado-sesion';
import { AccesoIngreso } from './AccesoIngreso';

const access = () => screen.getByRole('link');

function pageShow(persisted: boolean) {
  const event = new Event('pageshow') as PageTransitionEvent;
  Object.defineProperty(event, 'persisted', { value: persisted });
  window.dispatchEvent(event);
}

describe('AccesoIngreso (spec 007, RF-29 a RF-32)', () => {
  it('muestra "Ingresar" mientras se consulta', () => {
    render(<AccesoIngreso consultar={() => new Promise(() => {})} />);

    expect(access().textContent).toBe('Ingresar');
    expect(access().getAttribute('href')).toBe('/ingresar');
  });

  it('sigue en "Ingresar" sin sesión', async () => {
    const consultar = vi.fn().mockResolvedValue(null);
    render(<AccesoIngreso consultar={consultar} />);

    await act(async () => {});

    expect(access().textContent).toBe('Ingresar');
    expect(consultar).toHaveBeenCalled();
  });

  it('sigue en "Ingresar" si la consulta falla', async () => {
    render(<AccesoIngreso consultar={vi.fn().mockRejectedValue(new Error('sin red'))} />);

    await act(async () => {});

    expect(access().textContent).toBe('Ingresar');
  });

  it.each([
    ['portal', 'Ir a mi portal', '/portal'],
    ['panel', 'Ir al panel', '/panel'],
  ] as const)('con sesión de %s muestra "%s"', async (seccion, label, href) => {
    render(<AccesoIngreso consultar={vi.fn().mockResolvedValue(seccion)} />);

    expect(await screen.findByRole('link', { name: label })).toBeTruthy();
    expect(access().getAttribute('href')).toBe(href);
  });

  it('es un enlace común, sin ningún dato de la cuenta', async () => {
    const { container } = render(<AccesoIngreso consultar={vi.fn().mockResolvedValue('portal')} />);

    await screen.findByRole('link', { name: 'Ir a mi portal' });
    expect(container.textContent).toBe('Ir a mi portal');
    expect(access().tagName).toBe('A');
  });

  it('vuelve a consultar al volver atrás desde la caché del navegador', async () => {
    const consultar = vi
      .fn<() => Promise<SeccionSesion | null>>()
      .mockResolvedValueOnce('portal')
      .mockResolvedValueOnce(null);
    render(<AccesoIngreso consultar={consultar} />);
    await screen.findByRole('link', { name: 'Ir a mi portal' });

    pageShow(false);
    expect(consultar).toHaveBeenCalledTimes(1);

    await act(async () => pageShow(true));

    expect(consultar).toHaveBeenCalledTimes(2);
    expect(access().textContent).toBe('Ingresar');
  });
});
