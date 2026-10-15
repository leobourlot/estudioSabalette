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
    { red: 'Instagram', usuario: '@estudio', url: 'https://instagram.com/estudio' },
    { red: 'LinkedIn', usuario: 'Pertusatti Sabalette', url: 'https://linkedin.com/company/x' },
    { red: 'Instagram', usuario: '@abogada', url: 'https://instagram.com/abogada' },
  ],
};

const block = () => screen.getByRole('region', { name: 'Contactate con nosotros' });
const labels = () =>
  Array.from(block().querySelectorAll('[data-etiqueta]')).map((p) => p.textContent);

describe('ContactoSitio (spec 007, RF-23 a RF-25)', () => {
  it('tiene el título, la línea y el texto del modelo (T-17)', () => {
    render(<ContactoSitio mensaje={MESSAGE} />);

    expect(block().id).toBe('contacto');
    expect(
      within(block()).getByRole('heading', { level: 2, name: 'Contactate con nosotros' }),
    ).toBeTruthy();
    expect(
      within(block()).getByText(
        'Estamos disponibles para escucharte. La primera consulta es el primer paso para resolver tu problema legal.',
      ),
    ).toBeTruthy();
  });

  it('con los datos de hoy solo muestra "Teléfono / WhatsApp" (RF-24)', () => {
    render(<ContactoSitio mensaje={MESSAGE} />);

    expect(labels()).toEqual(['Teléfono / WhatsApp']);
    const whatsapp = within(block()).getByRole('link', { name: '+54 9 3455 41-4147' });
    expect(new URL(whatsapp.getAttribute('href')!).searchParams.get('text')).toBe(MESSAGE);
    expect(within(block()).queryByRole('link', { name: 'Cómo llegar' })).toBeNull();
  });

  it('con datos completos muestra cada renglón en orden, una red por renglón', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    expect(labels()).toEqual([
      'Ubicación',
      'Teléfono / WhatsApp',
      'Disponibilidad',
      'Email',
      'Instagram',
      'LinkedIn',
    ]);
    expect(within(block()).getByText('San Martín 123, Piso 2, Villaguay')).toBeTruthy();
    const maps = within(block()).getByRole('link', { name: 'Cómo llegar' });
    expect(new URL(maps.getAttribute('href')!).searchParams.get('query')).toBe(
      'San Martín 123, Piso 2, Villaguay',
    );
    expect(within(block()).getByText('Lunes a viernes de 8 a 13')).toBeTruthy();
    expect(within(block()).getByText('Martes y jueves de 17 a 20')).toBeTruthy();
    expect(
      within(block()).getByRole('link', { name: 'estudio@ejemplo.test' }).getAttribute('href'),
    ).toBe('mailto:estudio@ejemplo.test');
  });

  it('una red con dos cuentas las muestra en su renglón, cada una con su enlace', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    const instagram = block().querySelectorAll('li')[4];
    expect(
      within(instagram)
        .getAllByRole('link')
        .map((a) => [a.textContent, a.getAttribute('href')]),
    ).toEqual([
      ['@estudio', 'https://instagram.com/estudio'],
      ['@abogada', 'https://instagram.com/abogada'],
    ]);
  });

  it('"Cómo llegar" solo aparece con dirección', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={{ ...complete, direccion: null }} />);

    expect(labels()).not.toContain('Ubicación');
    expect(within(block()).queryByRole('link', { name: 'Cómo llegar' })).toBeNull();
  });

  it('todos los enlaces se abren aparte, sin control sobre esta página (RF-25)', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    const links = within(block()).getAllByRole('link');
    expect(links).toHaveLength(6);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('los íconos no se anuncian', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    for (const svg of block().querySelectorAll('svg')) {
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});
