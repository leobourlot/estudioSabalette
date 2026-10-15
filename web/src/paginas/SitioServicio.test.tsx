import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { headingOutline, renderAt, stubSessionStatus } from '../pruebas/sitio-de-prueba';
import { MENSAJES_WHATSAPP, SERVICIOS } from '../servicios/contenido-sitio';
import { publicPageFor } from '../servicios/rutas-sitio';
import { type ClaveServicioConPagina, SitioServicio } from './SitioServicio';

beforeEach(() => {
  stubSessionStatus(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const CASES = (['accidentes', 'danos', 'sucesiones'] as const).map((clave) => {
  const servicio = SERVICIOS.find((s) => s.clave === clave)!;
  return [servicio.titulo, clave, servicio] as const;
});

const whatsappText = () =>
  new URL(
    screen.getByRole('link', { name: 'Escribinos por WhatsApp' }).getAttribute('href')!,
  ).searchParams.get('text');

describe('SitioServicio (spec 007, RF-7, RF-13 y RF-14)', () => {
  it.each(CASES)('%s', (_titulo, clave: ClaveServicioConPagina, servicio) => {
    const { container } = renderAt(servicio.ruta, <SitioServicio clave={clave} />);

    expect(screen.getByRole('link', { name: 'Volver a servicios' }).getAttribute('href')).toBe(
      '/#servicios',
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(servicio.titulo);
    expect(headingOutline(container).filter((h) => h.startsWith('h1'))).toHaveLength(1);

    for (const bloque of servicio.bloques) {
      const texts = bloque.tipo === 'parrafo' ? [bloque.texto] : bloque.items;
      for (const text of texts) expect(screen.getByText(text)).toBeTruthy();
    }

    const others = within(screen.getByRole('navigation', { name: 'Otros servicios' }));
    expect(others.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual(
      SERVICIOS.filter((s) => s.clave !== clave).map((s) => [s.nombre, s.ruta]),
    );

    expect(whatsappText()).toBe(MENSAJES_WHATSAPP[clave]);
    expect(document.title).toBe(publicPageFor(servicio.ruta)!.titulo);
  });

  it('Accidentes lleva el título largo en la página y el corto en los accesos', () => {
    renderAt('/servicios/accidentes-de-trabajo', <SitioServicio clave="accidentes" />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Accidentes de trabajo y enfermedades profesionales',
    );
  });

  it('desde Sucesiones, "Otros servicios" lleva Derecho Laboral a Empresas', () => {
    renderAt('/servicios/sucesiones', <SitioServicio clave="sucesiones" />);

    expect(screen.getByRole('link', { name: 'Derecho Laboral' }).getAttribute('href')).toBe(
      '/servicios/derecho-laboral/empresas',
    );
    expect(screen.getByRole('link', { name: 'Accidentes y Enfermedades Laborales' })).toBeTruthy();
  });
});
