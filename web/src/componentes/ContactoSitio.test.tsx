import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STUDIO_CONTACT, type StudioContact } from '../servicios/datos-estudio';
import { ContactoSitio } from './ContactoSitio';

const MESSAGE = 'Hola, me contacto desde el sitio web por una consulta sobre sucesiones.';

const complete: StudioContact = {
  ...STUDIO_CONTACT,
  direccion: 'San Martín 123, Piso 2, Villaguay',
  horarios: ['Lunes a viernes de 8 a 13', 'Martes y jueves de 17 a 20'],
  email: 'estudio@ejemplo.test',
  redes: [
    { red: 'Instagram', url: 'https://instagram.com/estudio' },
    { red: 'LinkedIn', url: 'https://linkedin.com/company/estudio' },
  ],
};

const block = () => screen.getByRole('contentinfo', { name: 'Contacto' });
const titles = () => Array.from(block().querySelectorAll('dt')).map((dt) => dt.textContent);

describe('ContactoSitio (spec 007, RF-23 a RF-25)', () => {
  it('con los datos de hoy muestra solo el nombre y el WhatsApp, sin títulos vacíos (RF-24)', () => {
    render(<ContactoSitio mensaje={MESSAGE} />);

    expect(block().id).toBe('contacto');
    expect(within(block()).getByRole('heading', { level: 2, name: 'Contacto' })).toBeTruthy();
    expect(within(block()).getByText('Pertusatti | Sabalette').parentElement!.textContent).toBe(
      'Pertusatti | Sabalette - Abogadas',
    );
    expect(titles()).toEqual(['WhatsApp']);
    const whatsapp = within(block()).getByRole('link', { name: '+54 9 3455 41-4147' });
    expect(new URL(whatsapp.getAttribute('href')!).searchParams.get('text')).toBe(MESSAGE);
    expect(within(block()).queryByRole('link', { name: 'Cómo llegar' })).toBeNull();
  });

  it('con datos completos muestra cada uno con su título', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    expect(titles()).toEqual([
      'WhatsApp',
      'Dirección',
      'Horarios de atención',
      'Email',
      'Redes sociales',
    ]);
    expect(within(block()).getByText('San Martín 123, Piso 2, Villaguay')).toBeTruthy();
    const maps = within(block()).getByRole('link', { name: 'Cómo llegar' });
    expect(new URL(maps.getAttribute('href')!).searchParams.get('query')).toBe(
      'San Martín 123, Piso 2, Villaguay',
    );
    expect(maps.getAttribute('href')!.startsWith('https://www.google.com/maps/')).toBe(true);
    expect(within(block()).getByText('Lunes a viernes de 8 a 13')).toBeTruthy();
    expect(within(block()).getByText('Martes y jueves de 17 a 20')).toBeTruthy();
    expect(
      within(block()).getByRole('link', { name: 'estudio@ejemplo.test' }).getAttribute('href'),
    ).toBe('mailto:estudio@ejemplo.test');
    expect(within(block()).getByRole('link', { name: 'Instagram' }).getAttribute('href')).toBe(
      'https://instagram.com/estudio',
    );
    expect(within(block()).getByRole('link', { name: 'LinkedIn' })).toBeTruthy();
  });

  it('"Cómo llegar" solo aparece con dirección', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={{ ...complete, direccion: null }} />);

    expect(titles()).not.toContain('Dirección');
    expect(within(block()).queryByRole('link', { name: 'Cómo llegar' })).toBeNull();
  });

  it('todos los enlaces se abren aparte, sin control sobre esta página (RF-25)', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    const links = within(block()).getAllByRole('link');
    expect(links).toHaveLength(5);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('los íconos de las redes no se anuncian', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    for (const svg of block().querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });
});
