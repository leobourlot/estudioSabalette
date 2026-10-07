import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextoLiteral } from './TextoLiteral';

describe('TextoLiteral (RNF de textos seguros, RF-3)', () => {
  it('muestra comillas, & y saltos de línea tal como se cargaron, con las líneas en blanco', () => {
    const texto = 'Se presentó "escrito" de Pérez & Cía.\n\nSegundo párrafo: art. 250.';

    const { container } = render(<TextoLiteral texto={texto} />);

    const paragraph = container.querySelector('p')!;
    expect(paragraph.textContent).toBe(texto);
    expect(paragraph.className).toContain('whitespace-pre-wrap');
    expect(paragraph.className).toContain('break-words');
  });

  it('nunca interpreta el texto como código ni como formato', () => {
    const texto = '<b>negrita</b><img src=x onerror="alert(1)">';

    const { container } = render(<TextoLiteral texto={texto} />);

    const paragraph = container.querySelector('p')!;
    expect(paragraph.children).toHaveLength(0);
    expect(paragraph.textContent).toBe(texto);
    expect(container.querySelector('b, img')).toBeNull();
  });

  it('suma las clases indicadas', () => {
    const { container } = render(<TextoLiteral texto="Texto." className="text-sm" />);
    expect(container.querySelector('p')!.className).toBe('whitespace-pre-wrap break-words text-sm');
  });
});
