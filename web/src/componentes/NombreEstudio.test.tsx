import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NombreEstudio } from './NombreEstudio';

describe('NombreEstudio (spec 007, RF-3)', () => {
  it('muestra el nombre en dos líneas, y la primera no se corta', () => {
    render(<NombreEstudio />);

    const first = screen.getByText('Pertusatti | Sabalette');
    const second = screen.getByText('Abogadas');
    expect(first.className).toContain('whitespace-nowrap');
    expect(first.parentElement).toBe(second.parentElement);
    expect(first.parentElement!.className).toContain('flex-col');
  });

  it('se lee completo: su texto es el nombre exacto del estudio', () => {
    render(<NombreEstudio />);

    expect(screen.getByText('Pertusatti | Sabalette').parentElement!.textContent).toBe(
      'Pertusatti | Sabalette - Abogadas',
    );
    expect(screen.getByText('-').className).toContain('sr-only');
  });
});
