import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SERVICIOS } from '../servicios/contenido-sitio';
import { BloquesTexto } from './BloquesTexto';
import { TarjetaServicio } from './TarjetaServicio';

describe('BloquesTexto (spec 007, RF-2 y RF-14)', () => {
  it('muestra cada párrafo y cada punto de una lista', () => {
    const { container } = render(
      <BloquesTexto
        bloques={[
          { tipo: 'parrafo', texto: 'Primer párrafo.' },
          { tipo: 'parrafo', texto: 'Nuestro asesoramiento comprende:' },
          { tipo: 'lista', items: ['Uno.', 'Dos.', 'Tres.'] },
        ]}
      />,
    );

    expect(Array.from(container.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      'Primer párrafo.',
      'Nuestro asesoramiento comprende:',
    ]);
    const list = screen.getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Uno.', 'Dos.', 'Tres.']);
  });

  it('muestra un texto con etiquetas como texto, sin interpretarlas', () => {
    const { container } = render(
      <BloquesTexto bloques={[{ tipo: 'parrafo', texto: 'Texto con <b>negrita</b>' }]} />,
    );

    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('Texto con <b>negrita</b>')).toBeTruthy();
  });
});

describe('TarjetaServicio (spec 007, RF-12)', () => {
  it.each(SERVICIOS.map((s) => [s.nombre, s] as const))('%s', (_nombre, servicio) => {
    render(<TarjetaServicio servicio={servicio} />);

    expect(screen.getByRole('heading', { level: 3, name: servicio.nombre })).toBeTruthy();
    expect(screen.getByText(servicio.frase)).toBeTruthy();
    const link = screen.getByRole('link', { name: `Conocer más sobre ${servicio.nombre}` });
    expect(link.getAttribute('href')).toBe(servicio.ruta);
    expect(link.textContent).toBe(`Conocer más sobre ${servicio.nombre}`);
    expect(within(link).getByText(`sobre ${servicio.nombre}`).className).toContain('sr-only');
  });
});

describe('TarjetaServicio: el ícono del tema (spec 007, RF-12 y RF-45)', () => {
  const icon = (container: HTMLElement) => container.querySelector('svg')!;

  it('cada servicio tiene su propio ícono, arriba del nombre, que no se anuncia', () => {
    const drawings = SERVICIOS.map((servicio) => {
      const { container, unmount } = render(<TarjetaServicio servicio={servicio} />);
      const svg = icon(container);
      expect(svg.getAttribute('data-icono')).toBe(servicio.clave);
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.getAttribute('focusable')).toBe('false');
      expect(svg.compareDocumentPosition(screen.getByRole('heading'))).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      const drawing = svg.innerHTML;
      unmount();
      return drawing;
    });

    expect(new Set(drawings).size).toBe(SERVICIOS.length);
  });

  it('se mueve al pasar el puntero por la tarjeta o al enfocarla, solo sin la reducción de movimiento', () => {
    for (const servicio of SERVICIOS) {
      const { container, unmount } = render(<TarjetaServicio servicio={servicio} />);
      expect(container.querySelector('article')!.className).toMatch(/(^| )group( |$)/);
      const moving = Array.from(icon(container).querySelectorAll('[class*="animate-"]'));
      expect(moving.length).toBeGreaterThan(0);
      for (const part of moving) {
        const animations = part
          .getAttribute('class')!
          .split(' ')
          .filter((c) => c.includes('animate-'));
        expect(animations).toHaveLength(2);
        for (const animation of animations) {
          expect(animation).toMatch(/^motion-safe:group-(hover|focus-within):animate-icono-/);
        }
      }
      unmount();
    }
  });
});
