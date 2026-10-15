import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BotonWhatsapp } from './BotonWhatsapp';

const button = () => screen.getByRole('link', { name: 'Escribinos por WhatsApp' });

describe('BotonWhatsapp (spec 007, RF-26 y RF-27; spec 004, RF-19)', () => {
  it('sin mensaje abre la conversación vacía, como en el portal y el ingreso', () => {
    render(<BotonWhatsapp />);

    expect(button().getAttribute('href')).toBe('https://wa.me/5493455414147');
  });

  it('con mensaje lo deja escrito', () => {
    render(<BotonWhatsapp mensaje="Hola, me contacto desde el sitio web del estudio." />);

    const href = button().getAttribute('href')!;
    expect(new URL(href).searchParams.get('text')).toBe(
      'Hola, me contacto desde el sitio web del estudio.',
    );
  });

  it('se abre aparte, sin control sobre la página de origen (RF-25)', () => {
    render(<BotonWhatsapp />);

    expect(button().getAttribute('target')).toBe('_blank');
    expect(button().getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('queda fijo abajo a la derecha', () => {
    render(<BotonWhatsapp />);

    expect(button().className).toContain('fixed');
    expect(button().className).toContain('bottom-4');
    expect(button().className).toContain('right-4');
  });
});
