import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTituloDocumento } from './useTituloDocumento';

function Pagina({ titulo }: { titulo: string }) {
  useTituloDocumento(titulo);
  return null;
}

describe('useTituloDocumento (spec 007, RF-34)', () => {
  it('pone el título y lo cambia cuando cambia el pedido', () => {
    const { rerender } = render(<Pagina titulo="Uno" />);
    expect(document.title).toBe('Uno');

    rerender(<Pagina titulo="Dos" />);
    expect(document.title).toBe('Dos');
  });
});
