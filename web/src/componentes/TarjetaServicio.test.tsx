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
