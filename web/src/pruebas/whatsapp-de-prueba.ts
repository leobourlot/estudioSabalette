import { screen, within } from '@testing-library/react';

/**
 * Ayudas para los tests del botón de WhatsApp (spec 007, RF-22, RF-26 y RF-27): el botón abre un
 * menú con el WhatsApp de cada abogada.
 */

export const WHATSAPP_BUTTON = 'Escribinos por WhatsApp';

/** El botón flotante (el <summary> del menú). */
export function whatsappButton(): HTMLElement {
  return screen.getByLabelText(WHATSAPP_BUTTON, { selector: 'summary' });
}

/** Las opciones del menú del botón: el texto, el número del enlace y el mensaje ya escrito. */
export function whatsappMenu() {
  const menu = screen.getByRole('list', { name: WHATSAPP_BUTTON });
  return within(menu)
    .getAllByRole('link')
    .map((link) => {
      const url = new URL(link.getAttribute('href')!);
      return {
        texto: link.textContent,
        numero: url.pathname.slice(1),
        mensaje: url.searchParams.get('text'),
      };
    });
}

/** El mensaje del botón, que es el mismo en todas sus opciones. */
export function whatsappMessage(): string | null {
  const messages = new Set(whatsappMenu().map((opcion) => opcion.mensaje));
  if (messages.size !== 1) throw new Error('Las opciones del botón no tienen el mismo mensaje');
  return [...messages][0];
}
