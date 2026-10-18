import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import { LOGO_PATH } from '../servicios/marca';
import type { UsuarioPropio } from '../servicios/sesion';

async function openAs(path: string, usuario: UsuarioPropio, firstHeading: string) {
  const service = fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(usuario) });
  renderApp(path, service);
  await screen.findByRole('heading', { name: firstHeading, level: 1 });
  return service;
}

const aside = () => document.getElementById('menu-lateral')!;
const menuButton = () => screen.getByRole('button', { name: 'Menú' });
const content = () => document.getElementById('contenido')!;
const current = () =>
  within(screen.getByRole('navigation'))
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent);

describe('MenuLateral (spec 008, RF-5 a RF-8)', () => {
  it('muestra el logo, el nombre del estudio en dos líneas y el nombre de la sección', async () => {
    await openAs('/panel', testUser('abogado'), 'Panel');

    const menu = within(aside());
    const home = menu.getByRole('link', { name: 'Pertusatti | Sabalette - Abogadas' });
    const logo = home.querySelector('img')!;
    expect(logo.getAttribute('src')).toBe(LOGO_PATH);
    expect(logo.getAttribute('alt')).toBe('');
    expect(within(home).getByText('Pertusatti | Sabalette').className).toContain(
      'whitespace-nowrap',
    );
    expect(menu.getAllByText('Panel del estudio').length).toBeGreaterThan(0);
  });

  it('la navegación tiene nombre y cada opción su ícono, que no se anuncia', async () => {
    await openAs('/portal', testUser('cliente'), 'Mis causas');

    const nav = screen.getByRole('navigation', { name: 'Portal' });
    for (const link of within(nav).getAllByRole('link')) {
      expect(link.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    }
    expect(within(aside()).getAllByText('Portal de clientes').length).toBeGreaterThan(0);
  });

  it.each([
    ['/panel', 'Panel', 'Inicio'],
    ['/panel/usuarios', 'Cuentas', 'Cuentas'],
    ['/panel/usuarios/nuevo', 'Nueva cuenta', 'Cuentas'],
    ['/panel/mi-cuenta', 'Mi cuenta', 'Mi cuenta'],
  ])('en %s marca como página actual solo "%s"', async (path, heading, option) => {
    await openAs(path, testUser('admin'), heading);

    expect(current()).toEqual([option]);
  });

  it('el logo del menú lleva al inicio de la sección (RF-8)', async () => {
    await openAs('/panel/mi-cuenta', testUser('abogado'), 'Mi cuenta');

    await userEvent
      .setup()
      .click(within(aside()).getByRole('link', { name: 'Pertusatti | Sabalette - Abogadas' }));

    expect(await screen.findByRole('heading', { name: 'Panel', level: 1 })).toBeTruthy();
  });

  it('el logo de la barra de arriba también lleva al inicio de la sección', async () => {
    await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    const bar = screen.getByRole('banner');
    expect(within(bar).getByRole('link').getAttribute('href')).toBe('/portal');
  });

  it('"Saltar al contenido" es lo primero y lleva al contenido, salteando el menú', async () => {
    await openAs('/panel', testUser('abogado'), 'Panel');

    const skip = screen.getByRole('link', { name: 'Saltar al contenido' });
    expect(skip.getAttribute('href')).toBe('#contenido');
    expect(content().getAttribute('tabindex')).toBe('-1');
    expect(content().contains(aside())).toBe(false);
    await userEvent.setup().tab();
    expect(document.activeElement).toBe(skip);
  });
});

describe('menú plegado (spec 008, RF-9 y RF-10)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('"Menú" lo abre, lo indica y deja el foco en "Cerrar menú" con el contenido inerte', async () => {
    await openAs('/panel', testUser('abogado'), 'Panel');
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(menuButton().getAttribute('aria-controls')).toBe('menu-lateral');
    expect(aside().className).toContain('invisible');

    await userEvent.setup().click(menuButton());

    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    expect(aside().className).not.toMatch(/(^| )invisible/);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar menú' }));
    expect(content().hasAttribute('inert')).toBe(true);
    expect(screen.getByRole('banner').hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('se cierra al elegir una opción y se ve el destino', async () => {
    const user = userEvent.setup();
    await openAs('/panel', testUser('abogado'), 'Panel');
    await user.click(menuButton());

    await user.click(within(aside()).getByRole('link', { name: 'Mi cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Mi cuenta', level: 1 })).toBeTruthy();
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(content().hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it.each([
    [
      'con "Cerrar menú"',
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Cerrar menú' })),
    ],
    ['con Escape', async (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}')],
  ])('se cierra %s y el foco vuelve a "Menú"', async (_, closeMenu) => {
    const user = userEvent.setup();
    await openAs('/panel', testUser('abogado'), 'Panel');
    await user.click(menuButton());

    await closeMenu(user);

    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(document.activeElement).toBe(menuButton()));
  });

  it('se cierra al tocar el fondo', async () => {
    const user = userEvent.setup();
    await openAs('/portal', testUser('cliente'), 'Mis causas');
    await user.click(menuButton());

    await user.click(screen.getByTestId('fondo-menu'));

    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('se cierra si la ventana pasa a 1024 px o más', async () => {
    const listeners: ((event: { matches: boolean }) => void)[] = [];
    vi.stubGlobal('matchMedia', (media: string) => ({
      media,
      matches: false,
      addEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        listeners.push(listener),
      removeEventListener: () => {},
    }));
    const user = userEvent.setup();
    await openAs('/panel', testUser('abogado'), 'Panel');
    await user.click(menuButton());

    act(() => listeners.forEach((listener) => listener({ matches: true })));

    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(content().hasAttribute('inert')).toBe(false);
  });

  it('no guarda nada en el navegador (RF-10)', async () => {
    localStorage.clear();
    sessionStorage.clear();
    const user = userEvent.setup();
    await openAs('/panel', testUser('abogado'), 'Panel');

    await user.click(menuButton());
    await user.keyboard('{Escape}');

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
