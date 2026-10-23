import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { headingOutline, renderAt, stubSessionStatus } from '../pruebas/sitio-de-prueba';
import { whatsappMessage } from '../pruebas/whatsapp-de-prueba';
import {
  type ClavePestana,
  MENSAJES_WHATSAPP,
  PESTANAS_LABORAL,
} from '../servicios/contenido-sitio';
import { SitioDerechoLaboral } from './SitioDerechoLaboral';

function Pestana() {
  const { pestana } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <SitioDerechoLaboral pestana={pestana as ClavePestana} />
      <output data-testid="direccion">{pathname}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Atrás
      </button>
    </>
  );
}

const openAt = (path: string) =>
  renderAt(
    path,
    <Routes>
      <Route path="/servicios/derecho-laboral/:pestana" element={<Pestana />} />
    </Routes>,
  );

const tabs = () => within(screen.getByRole('navigation', { name: 'Destinatarios' }));
const tab = (name: string) => tabs().getByRole('link', { name });
const address = () => screen.getByTestId('direccion').textContent;
const whatsappText = whatsappMessage;

beforeEach(() => {
  stubSessionStatus(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SitioDerechoLaboral (spec 007, RF-15 a RF-17)', () => {
  it('muestra el título, T-3 y las dos pestañas en orden', () => {
    openAt('/servicios/derecho-laboral/empresas');

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Derecho Laboral');
    expect(
      screen.getByText(
        'Acompañamos tanto a empresas como a trabajadores en la prevención, gestión y resolución de conflictos.',
      ),
    ).toBeTruthy();
    expect(
      tabs()
        .getAllByRole('link')
        .map((a) => [a.textContent, a.getAttribute('href')]),
    ).toEqual(PESTANAS_LABORAL.map((p) => [p.etiqueta, p.ruta]));
  });

  it('Empresas: es la página actual, con los destacados antes del texto', () => {
    const { container } = openAt('/servicios/derecho-laboral/empresas');

    expect(tab('Empresas').getAttribute('aria-current')).toBe('page');
    expect(tab('Trabajadores').getAttribute('aria-current')).toBeNull();
    expect(tab('Empresas').className).toContain('font-bold');

    const section = container.querySelector('section[aria-labelledby="pestana-titulo"]')!;
    expect(within(section as HTMLElement).getByRole('heading', { level: 2 }).textContent).toBe(
      'Empresas',
    );
    const lists = section.querySelectorAll('ul');
    expect(Array.from(lists[0].querySelectorAll('li')).map((li) => li.textContent)).toEqual(
      PESTANAS_LABORAL[0].destacados,
    );
    const firstParagraph = section.querySelector('p')!;
    expect(
      lists[0].compareDocumentPosition(firstParagraph) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText('Representación y defensa en procesos judiciales laborales.'),
    ).toBeTruthy();
    expect(whatsappText()).toBe(MENSAJES_WHATSAPP.empresas);
    expect(document.title).toBe(
      'Derecho Laboral para empresas · Pertusatti | Sabalette - Abogadas',
    );
  });

  it('Trabajadores: su texto, sin destacados', () => {
    openAt('/servicios/derecho-laboral/trabajadores');

    expect(tab('Trabajadores').getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Reclamos y procesos judiciales laborales.')).toBeTruthy();
    expect(screen.queryByText('Asesoramiento laboral preventivo')).toBeNull();
    expect(whatsappText()).toBe(MENSAJES_WHATSAPP.trabajadores);
  });

  it('elegir otra pestaña con el teclado cambia dirección, contenido, título y mensaje, y deja el foco en ella', async () => {
    const user = userEvent.setup();
    openAt('/servicios/derecho-laboral/empresas');

    tab('Trabajadores').focus();
    const element = document.activeElement;
    await user.keyboard('{Enter}');

    expect(address()).toBe('/servicios/derecho-laboral/trabajadores');
    expect(screen.getByText('Reclamos y procesos judiciales laborales.')).toBeTruthy();
    expect(document.title).toBe(
      'Derecho Laboral para trabajadores · Pertusatti | Sabalette - Abogadas',
    );
    expect(whatsappText()).toBe(MENSAJES_WHATSAPP.trabajadores);
    expect(document.activeElement).toBe(element);
    expect(tab('Trabajadores').getAttribute('aria-current')).toBe('page');
  });

  it('volver atrás muestra Empresas otra vez', async () => {
    const user = userEvent.setup();
    openAt('/servicios/derecho-laboral/empresas');
    await user.click(tab('Trabajadores'));

    await user.click(screen.getByRole('button', { name: 'Atrás' }));

    expect(address()).toBe('/servicios/derecho-laboral/empresas');
    expect(tab('Empresas').getAttribute('aria-current')).toBe('page');
  });

  it('tiene un único h1 y los títulos en orden', () => {
    const { container } = openAt('/servicios/derecho-laboral/trabajadores');

    expect(headingOutline(container)).toEqual([
      'h1 Derecho Laboral',
      'h2 Trabajadores',
      'h2 Otros servicios',
      'h2 Contactate con nosotros',
    ]);
  });
});
