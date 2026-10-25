import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';

async function openHome() {
  const service = fakeSessionService({
    fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado', { nombre: 'Juan' })),
  });
  renderApp('/panel', service);
  await screen.findByRole('heading', { name: 'Hola, Juan.', level: 1 });
}

const accesos = () => within(screen.getByRole('main')).getAllByRole('link');

describe('PanelInicio (spec 008, RF-25)', () => {
  it('muestra el saludo como único título principal y un acceso por cada opción del menú, salvo "Inicio"', async () => {
    await openHome();

    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
      'Hola, Juan.',
    ]);
    expect(screen.queryByRole('heading', { name: 'Panel' })).toBeNull();
    expect(accesos().map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Causas', '/panel/causas'],
      ['Jurisprudencia', '/panel/jurisprudencia'],
      ['Modelos de escritos', '/panel/modelos'],
      ['Cuentas', '/panel/usuarios'],
      ['Mi cuenta', '/panel/mi-cuenta'],
    ]);
  });

  it('cada acceso lleva su ícono, que no se anuncia', async () => {
    await openHome();

    for (const link of accesos()) {
      expect(link.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('no muestra contadores ni resúmenes', async () => {
    await openHome();

    expect(within(screen.getByRole('main')).queryByText(/\d/)).toBeNull();
  });

  it('el acceso "Cuentas" lleva a la gestión de cuentas', async () => {
    await openHome();

    await userEvent
      .setup()
      .click(within(screen.getByRole('main')).getByRole('link', { name: 'Cuentas' }));

    expect(await screen.findByRole('heading', { name: 'Cuentas', level: 1 })).toBeTruthy();
  });
});
