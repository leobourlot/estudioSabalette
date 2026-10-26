import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { whatsappMessage } from '../pruebas/whatsapp-de-prueba';
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
    expect(parts).toEqual(['a', 'header', 'contenido', 'contacto', 'footer', 'details']);
  });

  it('"Saltar al contenido" lleva al contenido, que puede recibir el foco', () => {
    renderLayout();

    const skip = screen.getByRole('link', { name: 'Saltar al contenido' });
    expect(skip.getAttribute('href')).toBe('#contenido');
    expect(screen.getByRole('main').id).toBe('contenido');
    expect(screen.getByRole('main').getAttribute('tabindex')).toBe('-1');
  });

  it('el botón, el bloque de contacto y el pie usan el mensaje de la página (RF-27)', () => {
    renderLayout();

    expect(whatsappMessage()).toBe(MESSAGE);
    // El contacto y el pie: un WhatsApp por abogada en cada uno (los emails no llevan mensaje).
    const links = screen.getAllByRole('link', {
      name: /^Dra\. (Carolina Pertusatti|Vanesa Sabalette): \+54 /,
    });
    expect(links).toHaveLength(4);
    for (const link of links) {
      expect(new URL(link.getAttribute('href')!).searchParams.get('text')).toBe(MESSAGE);
    }
  });

  it('el pie de página deja lugar a la derecha de su última fila para el botón (RF-28)', () => {
    renderLayout();

    const footer = screen.getByRole('contentinfo');
    expect(footer.className).toContain('pb-10');
    // Desde 640 px "Diseñado por" va a la derecha: queda fuera de los 72 px del botón.
    const lastRow = footer.firstElementChild!.lastElementChild!;
    expect(lastRow.textContent).toContain('Diseñado por');
    expect(lastRow.className).toContain('sm:pr-20');
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
      screen.getByRole('heading', { level: 2, name: 'Contactate con nosotros' }),
    );
  });

  it('con un "#" que no existe o mal formado no hace nada', () => {
    window.history.replaceState(null, '', '/#%E0%A4%A');

    renderLayout();

    expect(document.activeElement).toBe(document.body);
  });
});
