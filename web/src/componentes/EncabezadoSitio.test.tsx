import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EncabezadoSitio } from './EncabezadoSitio';
import { MenuSitio } from './MenuSitio';

const noSession = () => vi.fn().mockResolvedValue(null);

const details = () => document.querySelector('details')!;
const summary = () => screen.getByText('Menú');
const dropdown = () => within(details().querySelector('nav')!);

describe('EncabezadoSitio (spec 007, RF-3 y RF-4)', () => {
  it('el logo y el nombre llevan al inicio; el logo no se anuncia', () => {
    render(<EncabezadoSitio consultarSesion={noSession()} />);

    const home = screen.getByRole('link', { name: 'Pertusatti | Sabalette - Abogadas' });
    expect(home.getAttribute('href')).toBe('/');
    expect(home.querySelector('img')!.getAttribute('alt')).toBe('');
    expect(home.querySelector('img')!.getAttribute('src')).toBe('/marca/logo.jpg');
  });

  it('tiene el menú y el acceso de ingreso', () => {
    render(<EncabezadoSitio consultarSesion={() => new Promise(() => {})} />);

    const header = within(screen.getByRole('banner'));
    expect(header.getByRole('link', { name: 'Ingresar' }).getAttribute('href')).toBe('/ingresar');
    expect(header.getAllByRole('link', { name: 'Servicios' }).length).toBeGreaterThan(0);
  });
});

describe('MenuSitio (spec 007, RF-5 y RF-6)', () => {
  it('lleva a las secciones del inicio y al contacto de la página actual', () => {
    render(<MenuSitio />);

    const nav = within(screen.getAllByRole('navigation', { name: 'Principal' })[0]);
    expect(nav.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Servicios', '/#servicios'],
      ['Abogadas', '/#abogadas'],
      ['Contacto', '#contacto'],
    ]);
  });

  it('el menú plegado abre y cierra, e indica si está abierto', async () => {
    const user = userEvent.setup();
    render(<MenuSitio />);

    expect(details().open).toBe(false);
    expect(summary().getAttribute('aria-expanded')).toBe('false');

    await user.click(summary());
    expect(details().open).toBe(true);
    expect(summary().getAttribute('aria-expanded')).toBe('true');

    await user.click(summary());
    expect(details().open).toBe(false);
  });

  it('se cierra al elegir una opción y el foco vuelve a "Menú"', async () => {
    const user = userEvent.setup();
    render(<MenuSitio />);
    await user.click(summary());

    await user.click(dropdown().getByRole('link', { name: 'Contacto' }));

    expect(details().open).toBe(false);
    expect(document.activeElement).toBe(summary());
  });

  it('se cierra con Escape y el foco vuelve a "Menú"', async () => {
    const user = userEvent.setup();
    render(<MenuSitio />);
    await user.click(summary());
    dropdown().getByRole('link', { name: 'Abogadas' }).focus();

    await user.keyboard('{Escape}');

    expect(details().open).toBe(false);
    expect(document.activeElement).toBe(summary());
  });

  it('sin el código de la página, los enlaces ya están en el HTML (RF-35)', () => {
    const html = renderToString(<MenuSitio />);

    expect(html).toContain('<details');
    expect(html).toContain('<summary');
    expect(html).toContain('href="/#servicios"');
    expect(html).toContain('href="/#abogadas"');
    expect(html).toContain('href="#contacto"');
  });
});
