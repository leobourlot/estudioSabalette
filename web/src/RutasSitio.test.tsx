import { screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAt, stubSessionStatus } from './pruebas/sitio-de-prueba';
import { PUBLIC_PAGES } from './servicios/rutas-sitio';
import { SitioPublico } from './SitioPublico';

function Direccion() {
  const { pathname, hash } = useLocation();
  return <output data-testid="direccion">{pathname + hash}</output>;
}

const openAt = (path: string) =>
  renderAt(
    path,
    <>
      <SitioPublico />
      <Direccion />
    </>,
  );

const h1 = () => screen.getByRole('heading', { level: 1 }).textContent;

beforeEach(() => {
  stubSessionStatus(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('rutas del sitio público (spec 007, RF-1, RF-8 y RF-9)', () => {
  it.each(PUBLIC_PAGES.map((p) => [p.ruta, p.titulo] as const))(
    '%s muestra su página, con su título',
    (ruta, titulo) => {
      openAt(ruta);

      expect(document.title).toBe(titulo);
      expect(h1()).not.toBe('No encontramos esa página');
    },
  );

  it.each(['/abogadas/otra', '/servicios/derecho-laboral/otra', '/servicios/otro', '/no-existe'])(
    '%s muestra la página inexistente',
    (path) => {
      openAt(path);

      expect(h1()).toBe('No encontramos esa página');
    },
  );

  it.each([
    ['/servicios', '/#servicios'],
    ['/abogadas', '/#abogadas'],
    ['/servicios/derecho-laboral', '/servicios/derecho-laboral/empresas'],
  ])('%s lleva a %s', (path, destino) => {
    openAt(path);

    expect(screen.getByTestId('direccion').textContent).toBe(destino);
  });

  it('no monta la sesión de la aplicación: solo consulta el estado (RF-31)', () => {
    const fetch = stubSessionStatus(null);

    openAt('/');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]).toEqual([
      '/api/sesion/estado',
      expect.objectContaining({ credentials: 'include' }),
    ]);
  });
});
