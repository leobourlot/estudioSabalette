import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { whatsappButton, whatsappMenu, WHATSAPP_BUTTON } from '../pruebas/whatsapp-de-prueba';
import { BotonWhatsapp } from './BotonWhatsapp';

const MESSAGE = 'Hola, me contacto desde el sitio web del estudio.';

const details = () => whatsappButton().closest('details')!;
const menu = () => within(screen.getByRole('list', { name: WHATSAPP_BUTTON }));

describe('BotonWhatsapp (spec 007, RF-22, RF-26 y RF-27; spec 004, RF-19)', () => {
  it('queda fijo abajo a la derecha', () => {
    render(<BotonWhatsapp />);

    expect(details().className).toContain('fixed');
    expect(details().className).toContain('bottom-4');
    expect(details().className).toContain('right-4');
  });

  it('abre un menú con el WhatsApp de cada abogada, en el orden del logo', () => {
    render(<BotonWhatsapp />);

    expect(whatsappMenu()).toEqual([
      {
        texto: 'Dra. Carolina Pertusatti+54 9 3454 08-7098',
        numero: '5493454087098',
        mensaje: null,
      },
      {
        texto: 'Dra. Vanesa Sabalette+54 9 3455 41-4147',
        numero: '5493455414147',
        mensaje: null,
      },
    ]);
  });

  it('con mensaje, cada opción lo deja escrito', () => {
    render(<BotonWhatsapp mensaje={MESSAGE} />);

    expect(whatsappMenu().map((opcion) => opcion.mensaje)).toEqual([MESSAGE, MESSAGE]);
  });

  it('cada opción se abre aparte, sin control sobre la página de origen (RF-25)', () => {
    render(<BotonWhatsapp />);

    for (const link of menu().getAllByRole('link')) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('abre y cierra, e indica si está abierto', async () => {
    const user = userEvent.setup();
    render(<BotonWhatsapp />);

    expect(details().open).toBe(false);
    expect(whatsappButton().getAttribute('aria-expanded')).toBe('false');

    await user.click(whatsappButton());
    expect(details().open).toBe(true);
    expect(whatsappButton().getAttribute('aria-expanded')).toBe('true');

    await user.click(whatsappButton());
    expect(details().open).toBe(false);
  });

  it('se cierra con Escape, y el foco vuelve al botón', async () => {
    const user = userEvent.setup();
    render(<BotonWhatsapp />);
    await user.click(whatsappButton());
    menu().getAllByRole('link')[0].focus();

    await user.keyboard('{Escape}');

    expect(details().open).toBe(false);
    expect(document.activeElement).toBe(whatsappButton());
  });

  it('se cierra al elegir una opción y al tocar fuera', async () => {
    const user = userEvent.setup();
    render(
      <>
        <p>Afuera</p>
        <BotonWhatsapp />
      </>,
    );
    await user.click(whatsappButton());

    await user.click(screen.getByText('Afuera'));
    expect(details().open).toBe(false);

    await user.click(whatsappButton());
    await user.click(menu().getAllByRole('link')[1]);
    expect(details().open).toBe(false);
  });

  it('sin el código de la página, el menú y sus enlaces ya están en el HTML (RF-35)', () => {
    const html = renderToString(<BotonWhatsapp />);

    expect(html).toContain('<details');
    expect(html).toContain('href="https://wa.me/5493454087098"');
    expect(html).toContain('href="https://wa.me/5493455414147"');
  });
});
