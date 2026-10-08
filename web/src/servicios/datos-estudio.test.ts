import { describe, expect, it } from 'vitest';
import { STUDIO_CONTACT, whatsappUrl } from './datos-estudio';

describe('datos del estudio (RF-18, RF-19)', () => {
  it('tienen nombre, dirección y WhatsApp', () => {
    expect(STUDIO_CONTACT.nombre).toBe('Estudio Sabalette');
    expect(STUDIO_CONTACT.direccion).not.toBe('');
    expect(STUDIO_CONTACT.whatsapp).toMatch(/^\d+$/);
  });

  it('el enlace de WhatsApp abre una conversación con el estudio, sin mensaje precargado', () => {
    expect(whatsappUrl()).toBe(`https://wa.me/${STUDIO_CONTACT.whatsapp}`);
    expect(whatsappUrl()).not.toContain('?');
  });
});
