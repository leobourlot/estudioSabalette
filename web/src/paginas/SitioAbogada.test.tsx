import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { headingOutline, renderAt, stubSessionStatus } from '../pruebas/sitio-de-prueba';
import { whatsappMessage } from '../pruebas/whatsapp-de-prueba';
import {
  ABOGADAS,
  MENSAJES_WHATSAPP,
  SERVICIOS,
  TITULO_PROFESIONAL,
} from '../servicios/contenido-sitio';
import { SitioAbogada } from './SitioAbogada';
import { SitioNoEncontrada } from './SitioNoEncontrada';

const vanesa = ABOGADAS.find((a) => a.slug === 'vanesa-sabalette-rabello')!;
const carolina = ABOGADAS.find((a) => a.slug === 'carolina-pertusatti')!;

const whatsappText = whatsappMessage;

beforeEach(() => {
  stubSessionStatus(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SitioAbogada (spec 007, RF-7 y RF-19)', () => {
  it('muestra "Volver a abogadas", la foto, el nombre, "Abogada" y el texto completo', () => {
    const { container } = renderAt(
      '/abogadas/vanesa-sabalette-rabello',
      <SitioAbogada abogada={vanesa} />,
    );

    expect(screen.getByRole('link', { name: 'Volver a abogadas' }).getAttribute('href')).toBe(
      '/#abogadas',
    );
    expect(screen.getByText('VSR')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Vanesa Sabalette Rabello');
    expect(within(screen.getByRole('main')).getByText(TITULO_PROFESIONAL)).toBeTruthy();
    const paragraphs = Array.from(screen.getByRole('main').querySelectorAll('p')).map(
      (p) => p.textContent,
    );
    expect(paragraphs).toEqual([TITULO_PROFESIONAL, ...vanesa.texto!]);
    expect(headingOutline(container)).toEqual([
      'h1 Vanesa Sabalette Rabello',
      'h2 Contactate con nosotros',
    ]);
  });

  it('usa el mensaje general de WhatsApp y pone su título', () => {
    renderAt('/abogadas/vanesa-sabalette-rabello', <SitioAbogada abogada={vanesa} />);

    expect(whatsappText()).toBe(MENSAJES_WHATSAPP.general);
    expect(document.title).toBe('Vanesa Sabalette Rabello · Pertusatti | Sabalette - Abogadas');
  });
});

describe('SitioAbogada: Carolina Marisa Pertusatti (spec 007, RF-19)', () => {
  it('muestra su foto, su nombre, su título profesional y su texto completo', () => {
    renderAt('/abogadas/carolina-pertusatti', <SitioAbogada abogada={carolina} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Carolina Marisa Pertusatti',
    );
    expect(screen.getByRole('img', { name: 'Foto de Carolina Marisa Pertusatti' })).toBeTruthy();
    const paragraphs = Array.from(screen.getByRole('main').querySelectorAll('p')).map(
      (p) => p.textContent,
    );
    expect(paragraphs).toEqual([TITULO_PROFESIONAL, ...carolina.texto!]);
    expect(document.title).toBe('Carolina Marisa Pertusatti · Pertusatti | Sabalette - Abogadas');
  });
});

describe('SitioNoEncontrada (spec 007, RF-9 y RF-42)', () => {
  const PATH = '/servicios/no-existe-esto?texto=<script>alert(1)</script>#algo';

  it('muestra el aviso, "Ir al inicio" y los cuatro servicios', () => {
    renderAt(PATH, <SitioNoEncontrada />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('No encontramos esa página');
    expect(
      screen.getByText('Puede que la dirección esté mal escrita o que la página ya no exista.'),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir al inicio' }).getAttribute('href')).toBe('/');
    const services = within(screen.getByRole('navigation', { name: 'Servicios' }));
    expect(services.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(
      SERVICIOS.map((s) => s.ruta),
    );
  });

  it('nunca muestra la dirección pedida ni lo que viene después del "?"', () => {
    const { container } = renderAt(PATH, <SitioNoEncontrada />);

    expect(container.textContent).not.toContain('no-existe-esto');
    expect(container.textContent).not.toContain('script');
    expect(container.textContent).not.toContain('algo');
    expect(container.querySelector('script')).toBeNull();
  });

  it('tiene el encabezado, el contacto, el botón de WhatsApp y su título', () => {
    renderAt(PATH, <SitioNoEncontrada />);

    expect(screen.getByRole('banner')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Contactate con nosotros' })).toBeTruthy();
    expect(whatsappText()).toBe(MENSAJES_WHATSAPP.general);
    expect(document.title).toBe('Página no encontrada · Pertusatti | Sabalette - Abogadas');
  });
});
