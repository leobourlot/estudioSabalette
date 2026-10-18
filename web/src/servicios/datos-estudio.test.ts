import { describe, expect, it } from 'vitest';
import {
  mapsUrl,
  networksToShow,
  pickNetworks,
  STUDIO_CONTACT,
  type StudioContact,
  whatsappUrl,
} from './datos-estudio';
import { REDES_DE_MUESTRA } from './redes-de-muestra';

describe('datos del estudio (spec 007, RF-3 y RF-22; spec 004, RF-18)', () => {
  it('tienen el nombre del estudio, también en dos líneas', () => {
    expect(STUDIO_CONTACT.nombre).toBe('Pertusatti | Sabalette - Abogadas');
    expect(STUDIO_CONTACT.nombreLineas).toEqual(['Pertusatti | Sabalette', 'Abogadas']);
  });

  it('tienen el WhatsApp del estudio, para el enlace y para mostrar', () => {
    expect(STUDIO_CONTACT.whatsapp).toBe('5493455414147');
    expect(STUDIO_CONTACT.whatsappVisible).toBe('+54 9 3455 41-4147');
  });

  it('tienen la dirección, el email y la red que informó el estudio (RF-22)', () => {
    expect(STUDIO_CONTACT.direccion).toBe('Pueyrredón Nº 47, Concordia');
    expect(STUDIO_CONTACT.email).toBe('estudiojuridicovsr@gmail.com');
    expect(STUDIO_CONTACT.redes).toEqual([
      {
        red: 'Instagram',
        usuario: '@pertusattisabaletteabogadas',
        url: 'https://www.instagram.com/pertusattisabaletteabogadas/',
      },
    ]);
  });

  it('no tienen ningún dato inventado: lo que el estudio no informó queda vacío (RF-24)', () => {
    expect(STUDIO_CONTACT.horarios).toEqual([]);
    const all = JSON.stringify(STUDIO_CONTACT);
    expect(all).not.toContain('Ejemplo');
    expect(all).not.toContain('5491100000000');
  });
});

describe('whatsappUrl (spec 007, RF-27)', () => {
  it('sin mensaje abre la conversación vacía, como en el portal (spec 004, RF-19)', () => {
    expect(whatsappUrl()).toBe('https://wa.me/5493455414147');
  });

  it('con mensaje lo deja escrito, codificado', () => {
    const url = whatsappUrl('Hola, me contacto por una consulta sobre Derecho de Daños.');

    expect(url).toBe(
      'https://wa.me/5493455414147?text=Hola%2C%20me%20contacto%20por%20una%20consulta%20sobre%20Derecho%20de%20Da%C3%B1os.',
    );
    expect(new URL(url).searchParams.get('text')).toBe(
      'Hola, me contacto por una consulta sobre Derecho de Daños.',
    );
  });

  it('con un mensaje vacío abre la conversación sin mensaje', () => {
    expect(whatsappUrl('')).toBe('https://wa.me/5493455414147');
  });

  it('usa el número de los datos que recibe', () => {
    const contact: StudioContact = { ...STUDIO_CONTACT, whatsapp: '5491112345678' };

    expect(whatsappUrl(undefined, contact)).toBe('https://wa.me/5491112345678');
  });
});

describe('mapsUrl (spec 007, RF-23)', () => {
  it('abre la dirección en Google Maps, codificada', () => {
    const url = mapsUrl('San Martín 123, Piso 2 "B"');

    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
    expect(new URL(url).searchParams.get('query')).toBe('San Martín 123, Piso 2 "B"');
    expect(url).not.toContain(' ');
    expect(url).not.toContain('"');
  });
});

describe('redes de muestra (spec 007, RF-24)', () => {
  const real = [{ red: 'Instagram', usuario: '@estudio', url: 'https://instagram.com/estudio' }];

  it('pickNetworks usa las de muestra solo si se piden y el estudio no informó ninguna', () => {
    expect(pickNetworks([], REDES_DE_MUESTRA)).toBe(REDES_DE_MUESTRA);
    expect(pickNetworks([], null)).toEqual([]);
    expect(pickNetworks(real, REDES_DE_MUESTRA)).toBe(real);
  });

  it('son Instagram, Facebook, X y LinkedIn, con una cuenta de muestra y la página principal de cada red', () => {
    expect(REDES_DE_MUESTRA.map((r) => r.red)).toEqual(['Instagram', 'Facebook', 'X', 'LinkedIn']);
    for (const red of REDES_DE_MUESTRA) {
      expect(red.usuario).toBe('@cuenta-de-muestra');
      expect(new URL(red.url).pathname).toBe('/');
    }
  });

  it('fuera de la versión de desarrollo (acá, los tests) no se muestran', () => {
    expect(import.meta.env.MODE).not.toBe('development');
    expect(networksToShow()).toEqual(STUDIO_CONTACT.redes);
    expect(networksToShow({ ...STUDIO_CONTACT, redes: [] })).toEqual([]);
  });
});
