import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  fakeSessionService,
  findScreenHeading,
  INICIO_PANEL,
  renderApp,
  testUser,
} from '../pruebas/aplicacion-de-prueba';
import { BloqueContactoEstudio } from './BloqueContactoEstudio';
import { COLORES_MAPS } from './IconosContacto';
import { COLORES_REDES } from './IconosRedes';
import { mapsUrl, STUDIO_CONTACT, whatsappUrl } from '../servicios/datos-estudio';
import type { UsuarioPropio } from '../servicios/sesion';
import { whatsappButton, whatsappMenu } from '../pruebas/whatsapp-de-prueba';

async function openAs(path: string, usuario: UsuarioPropio, firstHeading: string) {
  const service = fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(usuario) });
  renderApp(path, service);
  await findScreenHeading(firstHeading);
  return service;
}

const navLinks = () =>
  within(screen.getByRole('navigation'))
    .getAllByRole('link')
    .map((link) => link.textContent);

describe('DisenoPanel (RF-16)', () => {
  it('muestra la navegación del panel y el nombre del usuario', async () => {
    await openAs(
      '/panel',
      testUser('abogado', { nombre: 'Juan', apellido: 'Pérez' }),
      INICIO_PANEL,
    );

    expect(navLinks()).toEqual([
      'Inicio',
      'Causas',
      'Jurisprudencia',
      'Modelos de escritos',
      'Cuentas',
      'Mi cuenta',
    ]);
    expect(screen.getByText('Juan Pérez')).toBeTruthy();
  });

  it('el encabezado muestra el nombre del estudio en dos líneas (spec 007, RF-3)', async () => {
    await openAs('/panel', testUser('abogado'), INICIO_PANEL);

    const firstLine = within(screen.getByRole('banner')).getByText('Pertusatti | Sabalette');
    expect(firstLine.className).toContain('whitespace-nowrap');
    expect(firstLine.parentElement!.textContent).toBe(STUDIO_CONTACT.nombre);
    expect(within(screen.getByRole('banner')).getByText('Abogadas')).toBeTruthy();
  });

  it('cerrar sesión llama al servicio y lleva a /ingresar', async () => {
    const service = await openAs('/panel/usuarios', testUser('admin'), 'Cuentas');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(service.logout).toHaveBeenCalledTimes(1);
  });

  it.each(['admin', 'abogado'] as const)(
    'cerrar sesión como %s vacía el portapapeles, para que un escrito copiado no quede en el equipo (spec 006, RF-44)',
    async (rol) => {
      // userEvent.setup() instala un portapapeles simulado en el navegador de pruebas.
      const user = userEvent.setup();
      const service = await openAs('/panel', testUser(rol), INICIO_PANEL);
      await navigator.clipboard.writeText('Señor Juez:\n\nLuis Gómez, DNI 20.111.222.');
      const writeText = vi.spyOn(navigator.clipboard, 'writeText');

      await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

      expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
      expect(writeText).toHaveBeenCalledExactlyOnceWith('');
      // El portapapeles simulado no devuelve texto si quedó vacío.
      expect(await navigator.clipboard.readText().catch(() => '')).toBe('');
      expect(service.logout).toHaveBeenCalledTimes(1);
      writeText.mockRestore();
    },
  );

  it('si el navegador no deja vaciar el portapapeles, la sesión se cierra igual (spec 006, RF-44)', async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new Error('sin permiso'));
    const service = await openAs('/panel', testUser('abogado'), INICIO_PANEL);

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(writeText).toHaveBeenCalledExactlyOnceWith('');
    expect(service.logout).toHaveBeenCalledTimes(1);
    writeText.mockRestore();
  });

  it('la navegación lleva a las páginas del panel', async () => {
    await openAs('/panel', testUser('admin'), INICIO_PANEL);

    await userEvent
      .setup()
      .click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Mi cuenta' }));

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

    const footer = screen.getByRole('contentinfo', { name: 'Contacto del estudio' });
    const contact = within(footer);
    expect(contact.getByText('Pertusatti | Sabalette').parentElement!.textContent).toBe(
      STUDIO_CONTACT.nombre,
    );
    expect(Array.from(footer.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      STUDIO_CONTACT.nombre,
      'Pueyrredón Nº 47, Concordia',
      'WhatsApp Dra. Carolina Pertusatti: +54 9 3454 08-7098',
      'WhatsApp Dra. Vanesa Sabalette: +54 9 3455 41-4147',
      'Instagram: @persaestudiojuridico',
    ]);
    // Una tarjeta al final, con un margen debajo mayor que el botón de WhatsApp (spec 008, RF-4).
    expect(footer.className).toContain('pb-24');
    expect(footer.firstElementChild!.className).toContain('border');
    for (const whatsapp of STUDIO_CONTACT.whatsapps) {
      const link = contact.getByRole('link', {
        name: `WhatsApp ${whatsapp.nombre}: ${whatsapp.visible}`,
      });
      expect(link.getAttribute('href')).toBe(whatsappUrl(whatsapp));
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('la dirección abre Google Maps y la cuenta de Instagram abre su perfil, aparte (spec 004, RF-18)', async () => {
    await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    const contact = within(screen.getByRole('contentinfo', { name: 'Contacto del estudio' }));
    const address = contact.getByRole('link', { name: 'Pueyrredón Nº 47, Concordia' });
    const instagram = contact.getByRole('link', { name: 'Instagram: @persaestudiojuridico' });
    expect(address.getAttribute('href')).toBe(mapsUrl('Pueyrredón Nº 47, Concordia'));
    expect(instagram.getAttribute('href')).toBe('https://www.instagram.com/persaestudiojuridico/');
    for (const link of [address, instagram]) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('cada dato lleva su ícono, que no se anuncia: Maps en la dirección y WhatsApp e Instagram con sus colores (spec 004, RF-18)', async () => {
    await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    const footer = screen.getByRole('contentinfo', { name: 'Contacto del estudio' });
    const links = within(footer).getAllByRole('link');
    expect(links).toHaveLength(4);
    for (const link of links) {
      const icon = link.querySelector('svg')!;
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(link.firstElementChild).toBe(icon);
      // Sin subrayado, salvo al pasar el puntero.
      expect(link.className.split(' ')).not.toContain('underline');
      expect(link.className.split(' ')).toContain('hover:underline');
    }
    const [address, ...rest] = links;
    expect(address.innerHTML).toContain(COLORES_MAPS.rojo);
    expect(rest[0].innerHTML).toContain(COLORES_REDES.whatsapp);
    expect(rest[1].innerHTML).toContain(COLORES_REDES.whatsapp);
    expect(rest[2].querySelector('radialGradient')).not.toBeNull();
  });

  it('sin dirección ni redes, muestra solo el nombre y los WhatsApp (spec 007, RF-24)', () => {
    render(<BloqueContactoEstudio contact={{ ...STUDIO_CONTACT, direccion: null, redes: [] }} />);

    const footer = screen.getByRole('contentinfo', { name: 'Contacto del estudio' });
    expect(Array.from(footer.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      STUDIO_CONTACT.nombre,
      'WhatsApp Dra. Carolina Pertusatti: +54 9 3454 08-7098',
      'WhatsApp Dra. Vanesa Sabalette: +54 9 3455 41-4147',
    ]);
  });

  it('muestra siempre el botón de WhatsApp abajo a la derecha, sin mensaje (spec 004, RF-19)', async () => {
    await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    const button = whatsappButton().closest('details')!;
    expect(button.className).toContain('fixed');
    expect(button.className).toContain('bottom-4');
    expect(button.className).toContain('right-4');
    expect(whatsappMenu().map((opcion) => [opcion.numero, opcion.mensaje])).toEqual([
      ['5493454087098', null],
      ['5493455414147', null],
    ]);
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

  it('cerrar sesión como cliente no toca el portapapeles: los escritos son solo del panel (spec 006, RF-44)', async () => {
    const user = userEvent.setup();
    const service = await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');
    await navigator.clipboard.writeText('algo que copió el cliente');

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(await navigator.clipboard.readText()).toBe('algo que copió el cliente');
    expect(service.logout).toHaveBeenCalledTimes(1);
  });
});

describe('BloqueContactoEstudio (spec 004, RF-18)', () => {
  it('muestra la dirección como texto cuando el estudio la informa', () => {
    render(
      <BloqueContactoEstudio
        contact={{ ...STUDIO_CONTACT, direccion: 'San Martín 123, Villaguay' }}
      />,
    );

    expect(screen.getByText('San Martín 123, Villaguay')).toBeTruthy();
  });

  it('sin dirección no la muestra ni deja un renglón vacío (spec 007, RF-24)', () => {
    render(<BloqueContactoEstudio contact={{ ...STUDIO_CONTACT, direccion: null }} />);

    const footer = screen.getByRole('contentinfo', { name: 'Contacto del estudio' });
    expect(Array.from(footer.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      STUDIO_CONTACT.nombre,
      'WhatsApp Dra. Carolina Pertusatti: +54 9 3454 08-7098',
      'WhatsApp Dra. Vanesa Sabalette: +54 9 3455 41-4147',
      'Instagram: @persaestudiojuridico',
    ]);
  });
});

describe('títulos del documento (spec 007, RF-34)', () => {
  it('el panel pone su título', async () => {
    await openAs('/panel', testUser('abogado'), INICIO_PANEL);

    await waitFor(() => expect(document.title).toBe('Panel · Pertusatti | Sabalette - Abogadas'));
  });

  it('el portal pone su título', async () => {
    await openAs('/portal/mi-cuenta', testUser('cliente'), 'Mi cuenta');

    await waitFor(() =>
      expect(document.title).toBe('Portal de clientes · Pertusatti | Sabalette - Abogadas'),
    );
  });
});
