import { act, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { start } from './entrada-sitio';
import { stubSessionStatus } from './pruebas/sitio-de-prueba';
import { SitioPublico } from './SitioPublico';

let root: HTMLElement;

beforeEach(() => {
  stubSessionStatus(null);
  root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
});

afterEach(() => {
  root.remove();
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('entrada-sitio (spec 007, RF-35)', () => {
  it.each(['/', '/servicios/sucesiones', '/servicios/derecho-laboral/trabajadores', '/no-existe'])(
    'hidrata el HTML prerenderizado de %s sin diferencias',
    async (path) => {
      const errors = vi.spyOn(console, 'error');
      root.innerHTML = renderToString(
        <StaticRouter location={path}>
          <SitioPublico />
        </StaticRouter>,
      );
      const prerendered = root.querySelector('h1')!;
      window.history.replaceState(null, '', path);

      await act(async () => start(root));

      expect(errors).not.toHaveBeenCalled();
      // Hidratar reutiliza los elementos del HTML en lugar de crearlos de nuevo.
      expect(root.querySelector('h1')).toBe(prerendered);
    },
  );

  it('monta desde cero un #root sin HTML prerenderizado (desarrollo)', async () => {
    root.innerHTML = '<!--app-->';
    window.history.replaceState(null, '', '/servicios/sucesiones');

    await act(async () => start(root));

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sucesiones');
  });
});
