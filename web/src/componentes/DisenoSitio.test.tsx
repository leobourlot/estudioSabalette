import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DisenoSitio } from './DisenoSitio';

const MESSAGE = 'Hola, me contacto desde el sitio web del estudio.';

function renderLayout() {
  return render(
    <DisenoSitio mensaje={MESSAGE} consultarSesion={vi.fn().mockResolvedValue(null)}>
      <section id="servicios">
        <h2 tabIndex={-1}>Nuestros servicios</h2>
      </section>
    </DisenoSitio>,
  );
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('DisenoSitio (spec 007, RF-4, RF-23, RF-26 y RF-28)', () => {
  it('ordena "Saltar al contenido", encabezado, contenido, contacto y botón de WhatsApp', () => {
    const { container } = renderLayout();

    const parts = Array.from(container.firstElementChild!.children).map(
      (el) => el.id || el.tagName.toLowerCase(),
    );
    expect(parts).toEqual(['a', 'header', 'contenido', 'contacto', 'a']);
  });

  it('"Saltar al contenido" lleva al contenido, que puede recibir el foco', () => {
    renderLayout();

    const skip = screen.getByRole('link', { name: 'Saltar al contenido' });
    expect(skip.getAttribute('href')).toBe('#contenido');
    expect(screen.getByRole('main').id).toBe('contenido');
    expect(screen.getByRole('main').getAttribute('tabindex')).toBe('-1');
  });

  it('el botón y el bloque de contacto usan el mensaje de la página (RF-27)', () => {
    renderLayout();

    const text = (name: string) =>
      new URL(screen.getByRole('link', { name }).getAttribute('href')!).searchParams.get('text');
    expect(text('Escribinos por WhatsApp')).toBe(MESSAGE);
    expect(text('+54 9 3455 41-4147')).toBe(MESSAGE);
  });

  it('el contacto deja lugar abajo para el botón (RF-28)', () => {
    renderLayout();

    expect(screen.getByRole('contentinfo', { name: 'Contacto' }).className).toContain('pb-28');
  });
});

describe('useFocoEnAncla (RNF de accesibilidad)', () => {
  it('al abrir con #servicios, el foco queda en el título de la sección', () => {
    window.history.replaceState(null, '', '/#servicios');

    renderLayout();

    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Nuestros servicios' }),
    );
  });

  it('al cambiar a #contacto, el foco queda en el título del contacto', () => {
    renderLayout();

    act(() => {
      window.history.replaceState(null, '', '/#contacto');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 2, name: 'Contacto' }),
    );
  });

  it('con un "#" que no existe o mal formado no hace nada', () => {
    window.history.replaceState(null, '', '/#%E0%A4%A');

    renderLayout();

    expect(document.activeElement).toBe(document.body);
  });
});
