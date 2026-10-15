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

describe('EncabezadoSitio (spec 007, RF-3, RF-4 y RF-6)', () => {
  it('el logo y el nombre llevan al inicio; el logo no se anuncia', () => {
    render(<EncabezadoSitio consultarSesion={noSession()} />);

    const home = screen.getByRole('link', { name: 'Pertusatti | Sabalette - Abogadas' });
    expect(home.getAttribute('href')).toBe('/');
    expect(home.querySelector('img')!.getAttribute('alt')).toBe('');
    expect(home.querySelector('img')!.getAttribute('src')).toBe('/marca/logo.jpg');
  });

  it('logo, nombre, menú y acceso van en una sola línea, sin partirse', () => {
    render(<EncabezadoSitio consultarSesion={noSession()} />);

    const row = screen.getByRole('banner').firstElementChild!;
    expect(row.className).toContain('flex');
    expect(row.className).not.toContain('flex-wrap');
  });

  it('el acceso está en el encabezado desde 420 px y en el menú plegado debajo de 420 px', () => {
    render(<EncabezadoSitio consultarSesion={() => new Promise(() => {})} />);

    const header = within(screen.getByRole('banner'));
    const accesses = header.getAllByRole('link', { name: 'Ingresar' });
    expect(accesses).toHaveLength(2);
    const inMenu = dropdown().getByRole('link', { name: 'Ingresar' });
    expect(inMenu.closest('li')!.className).toContain('min-[420px]:hidden');
    const inHeader = accesses.find((a) => a !== inMenu)!;
    expect(inHeader.className).toContain('max-[419px]:hidden');
    expect(inHeader.closest('details')).toBeNull();
  });

  it('consulta la sesión una sola vez para los dos accesos', async () => {
    const consultar = vi.fn().mockResolvedValue('portal');
    render(<EncabezadoSitio consultarSesion={consultar} />);

    expect(await screen.findAllByRole('link', { name: 'Ir a mi portal' })).toHaveLength(2);
    expect(consultar).toHaveBeenCalledTimes(1);
    expect(dropdown().getByRole('link', { name: 'Ir a mi portal' }).getAttribute('href')).toBe(
      '/portal',
    );
  });

  it('el menú desplegado se ubica respecto del encabezado, a lo ancho', () => {
    render(<EncabezadoSitio consultarSesion={noSession()} />);

    expect(screen.getByRole('banner').className).toContain('relative');
    const panel = details().querySelector('nav')!;
    expect(panel.className).toContain('absolute');
    expect(panel.className).toContain('inset-x-0');
    expect(panel.className).toContain('top-full');
    // Ningún elemento entre el panel y el encabezado está posicionado.
    for (let el = panel.parentElement; el && el.tagName !== 'HEADER'; el = el.parentElement) {
      expect(el.className).not.toMatch(/\b(relative|absolute|fixed|sticky)\b/);
    }
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

  it('sin acceso, el menú plegado solo tiene las tres opciones', () => {
    render(<MenuSitio />);

    expect(dropdown().getAllByRole('listitem')).toHaveLength(3);
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
