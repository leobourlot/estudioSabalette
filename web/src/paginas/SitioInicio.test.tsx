import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { headingOutline, renderAt, stubSessionStatus } from '../pruebas/sitio-de-prueba';
import { whatsappMessage } from '../pruebas/whatsapp-de-prueba';
import { APERTURA, INTRO_SERVICIOS, SERVICIOS } from '../servicios/contenido-sitio';
import { SitioInicio } from './SitioInicio';

beforeEach(() => {
  stubSessionStatus(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SitioInicio (spec 007, RF-11, RF-12 y RF-18)', () => {
  it('tiene un único h1 con el nombre del estudio, y los títulos en orden', () => {
    const { container } = renderAt('/', <SitioInicio />);

    expect(headingOutline(container)).toEqual([
      'h1 Pertusatti | Sabalette - Abogadas',
      'h2 Nuestros servicios',
      'h3 Derecho Laboral',
      'h3 Accidentes y Enfermedades Laborales',
      'h3 Derecho de Daños',
      'h3 Sucesiones',
      'h2 Abogadas',
      'h3 Dra. Carolina Marisa Pertusatti',
      'h3 Dra. Vanesa Sabalette Rabello',
      'h2 Contactate con nosotros',
    ]);
  });

  it('la apertura muestra T-1', () => {
    renderAt('/', <SitioInicio />);

    expect(screen.getByText(APERTURA)).toBeTruthy();
  });

  it('la apertura lleva de fondo la balanza, decorativa y detrás del texto', () => {
    renderAt('/', <SitioInicio />);

    const opening = screen.getByRole('heading', { level: 1 }).closest('section')!;
    const scale = opening.querySelector('[data-balanza]')!;
    expect(scale.getAttribute('aria-hidden')).toBe('true');
    expect(scale.getAttribute('class')).toContain('absolute');
    expect(scale.getAttribute('class')).toContain('pointer-events-none');
    expect(scale.nextElementSibling!.className).toContain('relative');
    expect(opening.className).toContain('overflow-hidden');
  });

  it('la sección Servicios muestra T-2 y las cuatro tarjetas, en orden', () => {
    renderAt('/', <SitioInicio />);

    const section = document.getElementById('servicios')!;
    expect(within(section).getByText(INTRO_SERVICIOS)).toBeTruthy();
    const links = within(section)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(links).toEqual(SERVICIOS.map((s) => s.ruta));
  });

  it('la sección Abogadas muestra las dos tarjetas', () => {
    renderAt('/', <SitioInicio />);

    const section = document.getElementById('abogadas')!;
    expect(within(section).getByText('CMP')).toBeTruthy();
    expect(within(section).getByText('VSR')).toBeTruthy();
    expect(within(section).getAllByRole('link')).toHaveLength(2);
  });

  it('las secciones tienen su "#" y su título recibe el foco', () => {
    renderAt('/', <SitioInicio />);

    for (const id of ['servicios', 'abogadas', 'contacto']) {
      const section = document.getElementById(id)!;
      expect(section.querySelector('h2')!.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('usa el mensaje de WhatsApp del inicio y pone su título', () => {
    renderAt('/', <SitioInicio />);

    expect(whatsappMessage()).toBe('Hola, me contacto desde el sitio web del estudio.');
    expect(document.title).toBe('Pertusatti | Sabalette - Abogadas');
  });
});
