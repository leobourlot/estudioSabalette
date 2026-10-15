import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STUDIO_CONTACT, type StudioContact } from '../servicios/datos-estudio';
import { PieSitio } from './PieSitio';

const MESSAGE = 'Hola, me contacto desde el sitio web del estudio.';

const withNetworks: StudioContact = {
  ...STUDIO_CONTACT,
  email: 'estudio@ejemplo.test',
  redes: [
    { red: 'Instagram', usuario: '@estudio', url: 'https://instagram.com/estudio' },
    { red: 'Instagram', usuario: '@abogada', url: 'https://instagram.com/abogada' },
  ],
};

const footer = () => within(screen.getByRole('contentinfo'));

describe('PieSitio (spec 007, RF-44)', () => {
  it('el logo y el nombre llevan al inicio', () => {
    render(<PieSitio mensaje={MESSAGE} anio={2026} />);

    const home = footer().getByRole('link', { name: 'Pertusatti | Sabalette - Abogadas' });
    expect(home.getAttribute('href')).toBe('/');
    expect(home.querySelector('img')!.getAttribute('alt')).toBe('');
  });

  it('tiene los accesos del menú', () => {
    render(<PieSitio mensaje={MESSAGE} anio={2026} />);

    const nav = within(screen.getByRole('navigation', { name: 'Pie de página' }));
    expect(nav.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Servicios', '/#servicios'],
      ['Abogadas', '/#abogadas'],
      ['Contacto', '#contacto'],
    ]);
  });

  it('el WhatsApp lleva el mensaje de la página', () => {
    render(<PieSitio mensaje={MESSAGE} anio={2026} />);

    const whatsapp = footer().getByRole('link', { name: '+54 9 3455 41-4147' });
    expect(new URL(whatsapp.getAttribute('href')!).searchParams.get('text')).toBe(MESSAGE);
  });

  it('con los datos de hoy no muestra email ni íconos de redes (RF-24)', () => {
    render(<PieSitio mensaje={MESSAGE} anio={2026} />);

    expect(footer().queryByRole('link', { name: /@|Instagram/ })).toBeNull();
    expect(screen.getByRole('contentinfo').querySelectorAll('svg')).toHaveLength(0);
  });

  it('con datos de prueba muestra el email y un ícono por cuenta, con el nombre de la red', () => {
    render(<PieSitio mensaje={MESSAGE} contact={withNetworks} anio={2026} />);

    expect(footer().getByRole('link', { name: 'estudio@ejemplo.test' }).getAttribute('href')).toBe(
      'mailto:estudio@ejemplo.test',
    );
    expect(
      footer()
        .getAllByRole('link', { name: /^Instagram/ })
        .map((a) => [a.getAttribute('aria-label'), a.getAttribute('href')]),
    ).toEqual([
      ['Instagram @estudio', 'https://instagram.com/estudio'],
      ['Instagram @abogada', 'https://instagram.com/abogada'],
    ]);
  });

  it('muestra la leyenda de derechos con el año de publicación (T-18)', () => {
    render(<PieSitio mensaje={MESSAGE} anio={2027} />);

    expect(
      footer().getByText(
        '© 2027 Pertusatti | Sabalette - Abogadas. Todos los derechos reservados.',
      ),
    ).toBeTruthy();
  });

  it('el año por defecto es el de la publicación del sitio', () => {
    render(<PieSitio mensaje={MESSAGE} />);

    expect(
      footer().getByText(
        `© ${new Date().getFullYear()} Pertusatti | Sabalette - Abogadas. Todos los derechos reservados.`,
      ),
    ).toBeTruthy();
  });

  it('"Diseñado por" Bourder Web, con su logo, lleva a su sitio aparte (T-18, RF-25)', () => {
    render(<PieSitio mensaje={MESSAGE} anio={2026} />);

    const link = footer().getByRole('link', { name: 'Bourder Web' });
    expect(link.getAttribute('href')).toBe('https://bourderweb.com.ar');
    expect(link.querySelector('img')!.getAttribute('src')).toBe('/marca/bourder-web.svg');
    expect(link.parentElement!.textContent).toBe('Diseñado por Bourder Web');
  });

  it('todos los enlaces externos se abren aparte', () => {
    render(<PieSitio mensaje={MESSAGE} contact={withNetworks} anio={2026} />);

    const external = footer()
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')!.match(/^(https?:|mailto:)/));
    expect(external).toHaveLength(5);
    for (const link of external) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});
