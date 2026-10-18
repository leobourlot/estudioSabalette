import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STUDIO_CONTACT, type StudioContact } from '../servicios/datos-estudio';
import { ContactoSitio } from './ContactoSitio';
import { COLORES_MAPS } from './IconosContacto';
import { COLORES_REDES, CONTORNO } from './IconosRedes';

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

  it('con los datos de hoy muestra todo salvo "Disponibilidad", que el estudio no informó (RF-24)', () => {
    render(<ContactoSitio mensaje={MESSAGE} />);

    expect(labels()).toEqual(['Ubicación', 'Teléfono / WhatsApp', 'Email', 'Instagram']);
    const whatsapp = within(block()).getByRole('link', { name: '+54 9 3455 41-4147' });
    expect(new URL(whatsapp.getAttribute('href')!).searchParams.get('text')).toBe(MESSAGE);
    expect(within(block()).getByText('Pueyrredón Nº 47, Concordia')).toBeTruthy();
  });

  it('sin dirección no muestra "Ubicación" ni "Cómo llegar" (RF-24)', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={{ ...STUDIO_CONTACT, direccion: null }} />);

    expect(labels()).not.toContain('Ubicación');
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

describe('ContactoSitio: WhatsApp (spec 007, RF-23)', () => {
  it('el renglón "Teléfono / WhatsApp" lleva el ícono de WhatsApp', () => {
    render(<ContactoSitio mensaje={MESSAGE} />);

    const row = within(block()).getByText('Teléfono / WhatsApp').closest('li')!;
    const icon = row.querySelector('[aria-hidden="true"] svg')!;
    expect(icon.querySelector('path')!.getAttribute('d')).toMatch(/^M12 2a10 10/);
  });

  it('en los tests no aparecen las redes de muestra, que son solo de desarrollo', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={{ ...STUDIO_CONTACT, redes: [] }} />);

    expect(labels()).not.toContain('Facebook');
    expect(within(block()).queryByText('@cuenta-de-muestra')).toBeNull();
  });
});

describe('ContactoSitio: íconos con sus colores y un contorno blanco (spec 007, RF-23)', () => {
  const row = (label: string) => within(block()).getByText(label).closest('li')!;
  const fills = (element: Element) =>
    Array.from(element.querySelectorAll('[fill]')).map((e) => e.getAttribute('fill'));

  it('los íconos no llevan fondo, y los que no tienen colores propios van en blanco', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    const boxes = Array.from(block().querySelectorAll('li > [aria-hidden="true"]'));
    expect(boxes).toHaveLength(6);
    for (const box of boxes) {
      expect(box.className).not.toMatch(/bg-/);
      expect(box.className).not.toMatch(/border/);
      expect(box.className).toContain('text-estudio-blanco');
    }
  });

  it('cada ícono a color tiene detrás su contorno blanco, del mismo dibujo', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    for (const label of ['Ubicación', 'Teléfono / WhatsApp', 'Instagram', 'LinkedIn']) {
      const outline = row(label).querySelector('svg > [stroke]')!;
      expect(outline.getAttribute('stroke')).toBe(CONTORNO.stroke);
      expect(outline.getAttribute('fill')).toBe('none');
      // El pin pinta sus colores dentro de un grupo recortado por su propio dibujo.
      const next = outline.nextElementSibling!;
      const shape = next.tagName === 'g' ? next.firstElementChild! : next;
      expect(shape.getAttribute('d') ?? shape.getAttribute('width')).toBe(
        outline.getAttribute('d') ?? outline.getAttribute('width'),
      );
    }
  });

  it('WhatsApp lleva su verde, y la ubicación, el pin con los cuatro colores de Maps', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    expect(fills(row('Teléfono / WhatsApp'))).toContain(COLORES_REDES.whatsapp);
    expect(fills(row('Ubicación'))).toEqual(expect.arrayContaining(Object.values(COLORES_MAPS)));
  });

  it('Instagram lleva su degradado y LinkedIn su azul', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    const instagram = row('Instagram');
    const gradient = instagram.querySelector('radialGradient')!;
    expect(fills(instagram)).toContain(`url(#${gradient.id})`);
    expect(fills(row('LinkedIn'))).toContain(COLORES_REDES.linkedin);
  });

  it('los ids de los degradados y los recortes no se repiten ni llevan signos que rompan url(#id)', () => {
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);
    render(<ContactoSitio mensaje={MESSAGE} contact={complete} />);

    const ids = Array.from(document.querySelectorAll('svg [id]')).map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
