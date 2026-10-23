import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mapsUrl, STUDIO_CONTACT, type StudioContact } from '../servicios/datos-estudio';
import { COLORES_REDES, CONTORNO } from './IconosRedes';
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

  it('el WhatsApp de cada abogada lleva el mensaje de la página (RF-22, RF-27)', () => {
    render(<PieSitio mensaje={MESSAGE} anio={2026} />);

    for (const whatsapp of STUDIO_CONTACT.whatsapps) {
      const link = footer().getByRole('link', { name: `${whatsapp.nombre}: ${whatsapp.visible}` });
      const url = new URL(link.getAttribute('href')!);
      expect(url.pathname).toBe(`/${whatsapp.numero}`);
      expect(url.searchParams.get('text')).toBe(MESSAGE);
      expect(link.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('las redes empiezan por el WhatsApp de cada abogada, con su ícono (RF-44)', () => {
    render(<PieSitio mensaje={MESSAGE} anio={2026} />);

    const redes = within(screen.getByRole('list', { name: 'Redes' }));
    expect(
      redes
        .getAllByRole('link')
        .slice(0, 2)
        .map((a) => a.textContent),
    ).toEqual(['Carolina Pertusatti: +54 9 3454 01-8174', 'Vanesa Sabalette: +54 9 3455 41-4147']);
  });

  it('en los tests no aparecen las redes de muestra, que son solo de desarrollo', () => {
    render(<PieSitio mensaje={MESSAGE} anio={2026} />);

    expect(screen.getByRole('contentinfo').textContent).not.toContain('Facebook');
  });

  it('con datos de prueba muestra el email y cada cuenta con su ícono y el nombre de la red', () => {
    render(<PieSitio mensaje={MESSAGE} contact={withNetworks} anio={2026} />);

    expect(footer().getByRole('link', { name: 'estudio@ejemplo.test' }).getAttribute('href')).toBe(
      'mailto:estudio@ejemplo.test',
    );
    expect(
      footer()
        .getAllByRole('link', { name: /^Instagram/ })
        .map((a) => [a.textContent, a.getAttribute('href'), Boolean(a.querySelector('svg'))]),
    ).toEqual([
      ['Instagram @estudio', 'https://instagram.com/estudio', true],
      ['Instagram @abogada', 'https://instagram.com/abogada', true],
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
    expect(external).toHaveLength(7);
    for (const link of external) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});

describe('PieSitio: redes de una sola cuenta (RF-44)', () => {
  it('muestran solo el nombre de la red', () => {
    const contact: StudioContact = {
      ...STUDIO_CONTACT,
      redes: [{ red: 'LinkedIn', usuario: 'Estudio', url: 'https://linkedin.com/company/x' }],
    };
    render(<PieSitio mensaje={MESSAGE} contact={contact} anio={2026} />);

    const redes = within(screen.getByRole('list', { name: 'Redes' }));
    expect(redes.getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Carolina Pertusatti: +54 9 3454 01-8174',
      'Vanesa Sabalette: +54 9 3455 41-4147',
      'LinkedIn',
    ]);
  });
});

describe('PieSitio: íconos a color, los mismos del contacto (spec 007, RF-23 y RF-44)', () => {
  it('WhatsApp e Instagram llevan sus colores y el contorno blanco', () => {
    render(<PieSitio mensaje={MESSAGE} contact={withNetworks} anio={2026} />);

    const icons = Array.from(screen.getByRole('list', { name: 'Redes' }).querySelectorAll('svg'));
    // El WhatsApp de cada abogada y las dos cuentas de Instagram.
    expect(icons).toHaveLength(4);
    for (const icon of icons) {
      expect(icon.querySelector(':scope > [stroke]')!.getAttribute('stroke')).toBe(CONTORNO.stroke);
    }
    const fills = icons.map((icon) =>
      Array.from(icon.querySelectorAll('[fill]')).map((e) => e.getAttribute('fill')),
    );
    expect(fills[0]).toContain(COLORES_REDES.whatsapp);
    expect(fills[1]).toContain(COLORES_REDES.whatsapp);
    expect(fills[2]).toContain(`url(#${icons[2].querySelector('radialGradient')!.id})`);
  });
});

describe('PieSitio: email y dirección debajo de las redes (spec 007, RF-24, RF-25 y RF-44)', () => {
  const ADDRESS = 'San Martín 123, Villaguay';
  const complete: StudioContact = { ...withNetworks, direccion: ADDRESS };

  it('muestra el email, que escribe al estudio, y la dirección, que la abre en Google Maps', () => {
    render(<PieSitio mensaje={MESSAGE} contact={complete} anio={2026} />);

    const list = screen.getByRole('list', { name: 'Email y dirección' });
    expect(
      within(list)
        .getAllByRole('link')
        .map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('target')]),
    ).toEqual([
      ['estudio@ejemplo.test', 'mailto:estudio@ejemplo.test', '_blank'],
      [ADDRESS, mapsUrl(ADDRESS), '_blank'],
    ]);
    for (const svg of list.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('va debajo de las redes', () => {
    render(<PieSitio mensaje={MESSAGE} contact={complete} anio={2026} />);

    const redes = screen.getByRole('list', { name: 'Redes' });
    expect(redes.nextElementSibling).toBe(screen.getByRole('list', { name: 'Email y dirección' }));
  });

  it('sin email ni dirección informados, no muestra la lista (RF-24)', () => {
    const contact: StudioContact = { ...STUDIO_CONTACT, email: null, direccion: null };
    render(<PieSitio mensaje={MESSAGE} contact={contact} anio={2026} />);

    expect(screen.queryByRole('list', { name: 'Email y dirección' })).toBeNull();
  });

  it('con solo la dirección, muestra la dirección sin el email', () => {
    const contact: StudioContact = { ...STUDIO_CONTACT, email: null, direccion: ADDRESS };
    render(<PieSitio mensaje={MESSAGE} contact={contact} anio={2026} />);

    const list = screen.getByRole('list', { name: 'Email y dirección' });
    expect(
      within(list)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual([ADDRESS]);
  });
});
