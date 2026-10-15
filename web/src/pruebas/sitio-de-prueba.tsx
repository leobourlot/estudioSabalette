import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

/**
 * Ayudas para los tests de las páginas públicas (spec 007). La consulta del estado de la sesión
 * se simula reemplazando fetch: las páginas usan la de servicios/estado-sesion.ts, como en el
 * sitio real.
 */

/** Simula GET /api/sesion/estado con la sección indicada. Devuelve el fetch simulado. */
export function stubSessionStatus(seccion: 'portal' | 'panel' | null = null) {
  // Una respuesta nueva en cada pedido: el cuerpo de una Response se lee una sola vez.
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ seccion }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

/** Renderiza un elemento del sitio en una dirección. */
export function renderAt(path: string, element: ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);
}

/** Los títulos de la página, en orden, con su nivel ("h1 Texto"). */
export function headingOutline(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(
    (h) => `${h.tagName.toLowerCase()} ${h.textContent}`,
  );
}
