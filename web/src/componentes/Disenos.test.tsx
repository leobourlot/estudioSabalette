import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import type { UsuarioPropio } from '../servicios/sesion';

async function openAs(path: string, usuario: UsuarioPropio, firstHeading: string) {
  const service = fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(usuario) });
  renderApp(path, service);
  await screen.findByRole('heading', { name: firstHeading });
  return service;
}

const navLinks = () =>
  within(screen.getByRole('navigation'))
    .getAllByRole('link')
    .map((link) => link.textContent);

describe('DisenoPanel (RF-16)', () => {
  it('muestra la navegación del panel y el nombre del usuario', async () => {
    await openAs('/panel', testUser('abogado', { nombre: 'Juan', apellido: 'Pérez' }), 'Panel');

    expect(navLinks()).toEqual(['Inicio', 'Cuentas', 'Mi cuenta']);
    expect(screen.getByText('Juan Pérez')).toBeTruthy();
  });

  it('cerrar sesión llama al servicio y lleva a /ingresar', async () => {
    const service = await openAs('/panel/usuarios', testUser('admin'), 'Cuentas');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(service.logout).toHaveBeenCalledTimes(1);
  });

  it('la navegación lleva a las páginas del panel', async () => {
    await openAs('/panel', testUser('admin'), 'Panel');

    await userEvent.setup().click(screen.getByRole('link', { name: 'Mi cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeTruthy();
  });
});

describe('DisenoPortal (RF-16)', () => {
  it('muestra la navegación del portal, sin la gestión de cuentas', async () => {
    await openAs(
      '/portal',
      testUser('cliente', { nombre: 'Laura', apellido: 'Sosa' }),
      'Mis causas',
    );

    expect(navLinks()).toEqual(['Mis causas', 'Mi cuenta']);
    expect(screen.getByText('Laura Sosa')).toBeTruthy();
  });

  it('cerrar sesión llama al servicio y lleva a /ingresar', async () => {
    const service = await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(service.logout).toHaveBeenCalledTimes(1);
  });
});
