import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { testFalloResumen } from '../pruebas/jurisprudencia-de-prueba';
import type { FalloResumen } from '../servicios/jurisprudencia';
import { EnlaceFuente } from './EnlaceFuente';
import { FilaFallo } from './FilaFallo';

function renderRow(overrides: Partial<FalloResumen> = {}) {
  render(
    <MemoryRouter>
      <ul>
        <FilaFallo fallo={testFalloResumen(overrides)} />
      </ul>
    </MemoryRouter>,
  );
  return screen.getByRole('listitem', { name: /Pérez c\/ López/ });
}

describe('FilaFallo (RF-22)', () => {
  it('muestra la fecha, el tribunal, el fuero, el número y la carátula con enlace al detalle', () => {
    const row = renderRow();

    expect(within(row).getByText('03/05/2019')).toBeTruthy();
    expect(within(row).getByText('CNCiv., Sala A')).toBeTruthy();
    expect(within(row).getByText('Civil')).toBeTruthy();
    expect(within(row).getByText('Nº 1234/2018')).toBeTruthy();
    const link = within(row).getByRole('link', { name: 'Pérez c/ López s/ daños' });
    expect(link.getAttribute('href')).toBe('/panel/jurisprudencia/5');
  });

  it('muestra las palabras clave en el orden en que llegan', () => {
    const row = renderRow();

    const keywords = within(within(row).getByRole('list', { name: 'Palabras clave del fallo' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(keywords).toEqual(['accidente de tránsito', 'daño moral']);
  });

  it('un fallo sin número no muestra "Nº"', () => {
    const row = renderRow({ numero: null });
    expect(within(row).queryByText(/^Nº/)).toBeNull();
  });

  it('un sumario de hasta 300 caracteres se muestra completo, sin "Ver más"', () => {
    const sumario = 'a'.repeat(300);
    const row = renderRow({ sumario });

    expect(within(row).getByText(sumario)).toBeTruthy();
    expect(within(row).queryByRole('button', { name: 'Ver más' })).toBeNull();
  });

  it('un sumario más largo se recorta a 300 caracteres, con "Ver más" y "Ver menos"', async () => {
    const sumario = `${'a'.repeat(300)}${'b'.repeat(50)}`;
    const row = renderRow({ sumario });
    const user = userEvent.setup();

    expect(within(row).getByText(`${'a'.repeat(300)}…`)).toBeTruthy();
    expect(within(row).queryByText(sumario)).toBeNull();

    await user.click(within(row).getByRole('button', { name: 'Ver más' }));
    expect(within(row).getByText(sumario)).toBeTruthy();

    await user.click(within(row).getByRole('button', { name: 'Ver menos' }));
    expect(within(row).getByText(`${'a'.repeat(300)}…`)).toBeTruthy();
  });

  it('muestra el sumario como texto literal, con sus saltos de línea', () => {
    const sumario = 'Primer párrafo con <b>etiquetas</b> & "comillas".\n\nSegundo párrafo.';
    const row = renderRow({ sumario });

    const text = within(row).getByText(/Primer párrafo/);
    expect(text.textContent).toBe(sumario);
    expect(text.querySelector('b')).toBeNull();
    expect(text.className).toContain('whitespace-pre-wrap');
  });

  it('un fallo desactivado lleva la etiqueta "Desactivado" (RF-25)', () => {
    expect(within(renderRow({ activo: false })).getByText('Desactivado')).toBeTruthy();
  });

  it('un fallo activo no lleva la etiqueta', () => {
    expect(within(renderRow()).queryByText('Desactivado')).toBeNull();
  });
});

describe('EnlaceFuente (RF-19, RNF de textos seguros)', () => {
  const VALID =
    'https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721';

  it('muestra la dirección completa como enlace y el dominio destacado', () => {
    render(<EnlaceFuente enlace={VALID} />);

    const link = screen.getByRole('link', { name: VALID });
    expect(link.getAttribute('href')).toBe(VALID);
    expect(screen.getByLabelText('Sitio: sjconsulta.csjn.gov.ar').textContent).toBe(
      'sjconsulta.csjn.gov.ar',
    );
  });

  it('abre en una pestaña nueva, sin dar la dirección del panel ni el control de la pestaña', () => {
    render(<EnlaceFuente enlace={VALID} />);

    const link = screen.getByRole('link', { name: VALID });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it.each([
    'http://csjn.gov.ar/fallo',
    'javascript:alert(1)',
    'https://csjn.gov.ar@sitio-falso.com/fallo',
    'https://190.12.34.56/fallo',
    'https://csjn.gov.ar/?q="><script>alert(1)</script>',
  ])('un enlace inválido (%s) se muestra solo como texto, sin dominio', (enlace) => {
    const { container } = render(<EnlaceFuente enlace={enlace} />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(container.textContent).toBe(enlace);
    expect(container.querySelector('script')).toBeNull();
    expect(screen.queryByLabelText(/^Sitio:/)).toBeNull();
  });
});
