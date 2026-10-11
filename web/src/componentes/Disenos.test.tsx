import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeSessionService, renderApp, testUser } from '../pruebas/aplicacion-de-prueba';
import { STUDIO_CONTACT, whatsappUrl } from '../servicios/datos-estudio';
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

    expect(navLinks()).toEqual([
      'Inicio',
      'Causas',
      'Jurisprudencia',
      'Modelos',
      'Cuentas',
      'Mi cuenta',
    ]);
    expect(screen.getByText('Juan Pérez')).toBeTruthy();
  });

  it('el encabezado muestra el nombre del estudio de sus datos de contacto', async () => {
    await openAs('/panel', testUser('abogado'), 'Panel');

    expect(within(screen.getByRole('banner')).getByText(STUDIO_CONTACT.nombre)).toBeTruthy();
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

    expect(navLinks()).toEqual(['Mis causas', 'Mi cuenta', 'Cambiar contraseña']);
    expect(screen.getByText('Laura Sosa')).toBeTruthy();
  });

  it('muestra los datos de contacto del estudio, con el WhatsApp como enlace (spec 004, RF-18)', async () => {
    await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    const contact = within(screen.getByRole('contentinfo', { name: 'Contacto del estudio' }));
    expect(contact.getByText(STUDIO_CONTACT.nombre)).toBeTruthy();
    expect(contact.getByText(STUDIO_CONTACT.direccion)).toBeTruthy();
    const link = contact.getByRole('link', { name: 'WhatsApp' });
    expect(link.getAttribute('href')).toBe(whatsappUrl());
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('muestra siempre el botón de WhatsApp abajo a la derecha (spec 004, RF-19)', async () => {
    await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    const button = screen.getByRole('link', { name: 'Escribinos por WhatsApp' });
    expect(button.getAttribute('href')).toBe(whatsappUrl());
    expect(button.className).toContain('fixed');
    expect(button.className).toContain('bottom-4');
    expect(button.className).toContain('right-4');
  });

  it('el enlace "Cambiar contraseña" lleva a la pantalla de cambio (spec 004, RF-2)', async () => {
    await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    await userEvent
      .setup()
      .click(
        within(screen.getByRole('navigation')).getByRole('link', { name: 'Cambiar contraseña' }),
      );

    expect(await screen.findByRole('heading', { name: 'Cambiar contraseña' })).toBeTruthy();
  });

  it('cerrar sesión llama al servicio y lleva a /ingresar', async () => {
    const service = await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(service.logout).toHaveBeenCalledTimes(1);
  });
});
