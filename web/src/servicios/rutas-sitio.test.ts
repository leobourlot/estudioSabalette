import { describe, expect, it } from 'vitest';
import { annexSection, quoteText } from '../pruebas/anexo-spec-007';
import { MENSAJES_WHATSAPP } from './contenido-sitio';
import {
  APP_TITLES,
  decideEntry,
  isAppPath,
  normalizePublicPath,
  NOT_FOUND_PAGE,
  PUBLIC_PAGES,
  publicPageFor,
} from './rutas-sitio';

/**
 * Lee T-16 del anexo: por cada página, su título y su descripción. "el texto T-n." se reemplaza
 * por la cita de esa sección, y "Sin descripción." por null.
 */
function annexTitles(): Map<string, { titulo: string; descripcion: string | null }> {
  const result = new Map<string, { titulo: string; descripcion: string | null }>();
  let label = '';
  for (const line of annexSection('T-16')) {
    if (line.startsWith('- ')) label = line.slice(2);
    const title = /^ {2}- Título: (.+)$/.exec(line);
    if (title) result.set(label, { titulo: title[1], descripcion: null });
    const description = /^ {2}- Descripción: (.+)$/.exec(line);
    if (description) {
      const reference = /^el texto (T-\d+)\.$/.exec(description[1]);
      result.get(label)!.descripcion = reference ? quoteTextOf(reference[1]) : description[1];
    }
  }
  return result;
}

function quoteTextOf(id: string): string {
  // T-3 a T-6 viven en una sola sección del anexo, como puntos con su cita.
  const grouped = annexSection('T-3 a T-6');
  const index = grouped.findIndex((line) => line.startsWith(`- ${id},`));
  if (index !== -1) return grouped[index + 1].replace(/^\s*>\s?/, '');
  return quoteText(annexSection(id));
}

const titles = annexTitles();
const byRoute = (ruta: string) => publicPageFor(ruta)!;

describe('títulos y descripciones contra el anexo (T-16, RF-34)', () => {
  it.each([
    ['Inicio', '/'],
    ['Derecho Laboral, pestaña Empresas', '/servicios/derecho-laboral/empresas'],
    ['Derecho Laboral, pestaña Trabajadores', '/servicios/derecho-laboral/trabajadores'],
    ['Accidentes', '/servicios/accidentes-de-trabajo'],
    ['Derecho de Daños', '/servicios/derecho-de-danos'],
    ['Sucesiones', '/servicios/sucesiones'],
    ['Página de Vanesa Sabalette Rabello', '/abogadas/vanesa-sabalette-rabello'],
  ])('%s', (label, ruta) => {
    const expected = titles.get(label)!;

    expect(byRoute(ruta).titulo).toBe(expected.titulo);
    expect(byRoute(ruta).descripcion).toBe(expected.descripcion);
  });

  it('página de dirección inexistente, sin descripción', () => {
    expect(NOT_FOUND_PAGE.titulo).toBe(titles.get('Página de dirección inexistente')!.titulo);
    expect(NOT_FOUND_PAGE.descripcion).toBeNull();
  });

  it('pantallas fuera del sitio público', () => {
    const lines = annexSection('T-16');
    const screen = (name: string) =>
      lines.find((line) => line.startsWith(`  - ${name}: `))!.slice(`  - ${name}: `.length);

    expect(APP_TITLES).toEqual({
      ingreso: screen('Ingreso'),
      cambioContrasena: screen('Cambio de contraseña'),
      portal: screen('Portal'),
      panel: screen('Panel'),
    });
  });
});

describe('páginas públicas (RF-1, RF-8)', () => {
  it('hay una por servicio, por pestaña y solo por las abogadas con página', () => {
    expect(PUBLIC_PAGES.map((p) => p.ruta)).toEqual([
      '/',
      '/servicios/derecho-laboral/empresas',
      '/servicios/derecho-laboral/trabajadores',
      '/servicios/accidentes-de-trabajo',
      '/servicios/derecho-de-danos',
      '/servicios/sucesiones',
      '/abogadas/vanesa-sabalette-rabello',
    ]);
  });

  it('cada una tiene su archivo y es indexable; la inexistente no', () => {
    expect(PUBLIC_PAGES.map((p) => p.archivo)).toEqual([
      'index.html',
      'servicios/derecho-laboral/empresas.html',
      'servicios/derecho-laboral/trabajadores.html',
      'servicios/accidentes-de-trabajo.html',
      'servicios/derecho-de-danos.html',
      'servicios/sucesiones.html',
      'abogadas/vanesa-sabalette-rabello.html',
    ]);
    expect(PUBLIC_PAGES.every((p) => p.indexable)).toBe(true);
    expect(NOT_FOUND_PAGE).toMatchObject({ archivo: '404.html', indexable: false });
  });

  it('cada una tiene el mensaje de WhatsApp que le corresponde (RF-27)', () => {
    expect(PUBLIC_PAGES.map((p) => p.mensaje)).toEqual([
      MENSAJES_WHATSAPP.general,
      MENSAJES_WHATSAPP.empresas,
      MENSAJES_WHATSAPP.trabajadores,
      MENSAJES_WHATSAPP.accidentes,
      MENSAJES_WHATSAPP.danos,
      MENSAJES_WHATSAPP.sucesiones,
      MENSAJES_WHATSAPP.general,
    ]);
    expect(NOT_FOUND_PAGE.mensaje).toBe(MENSAJES_WHATSAPP.general);
  });
});

describe('normalizePublicPath (RF-8)', () => {
  it.each([
    ['/', '/'],
    ['/servicios/sucesiones', '/servicios/sucesiones'],
    ['/Servicios/Sucesiones', '/servicios/sucesiones'],
    ['/servicios/sucesiones/', '/servicios/sucesiones'],
    ['/SERVICIOS/SUCESIONES//', '/servicios/sucesiones'],
    ['/servicios', '/#servicios'],
    ['/abogadas/', '/#abogadas'],
    ['/servicios/derecho-laboral', '/servicios/derecho-laboral/empresas'],
    ['/Servicios/Derecho-Laboral/', '/servicios/derecho-laboral/empresas'],
    ['/ingresar', '/ingresar'],
    ['/PANEL/causas/5', '/panel/causas/5'],
    ['/portal/', '/portal'],
  ])('%s → %s', (ruta, esperada) => {
    expect(normalizePublicPath(ruta)).toBe(esperada);
  });

  it.each([
    '/no-existe',
    '/servicios/otro',
    '/servicios/derecho-laboral/otra',
    '/abogadas/carolina-pertusatti',
    '/ingresar/x',
    '/index.html',
  ])('%s no existe', (ruta) => {
    expect(normalizePublicPath(ruta)).toBeNull();
  });
});

describe('isAppPath (RF-10)', () => {
  it.each([
    '/ingresar',
    '/cambiar-contrasena',
    '/panel',
    '/panel/x',
    '/portal',
    '/portal/causas/3',
  ])('%s es de la aplicación', (ruta) => {
    expect(isAppPath(ruta)).toBe(true);
  });

  it.each(['/', '/ingresar/x', '/panelx', '/portales', '/servicios/sucesiones'])(
    '%s no es de la aplicación',
    (ruta) => {
      expect(isAppPath(ruta)).toBe(false);
    },
  );
});

describe('decideEntry (plan 007, "Entrada")', () => {
  it('muestra el sitio en una dirección pública normal', () => {
    expect(decideEntry('/servicios/sucesiones')).toEqual({ tipo: 'sitio' });
  });

  it('muestra el sitio, con la página inexistente, en una dirección que no existe', () => {
    expect(decideEntry('/no-existe')).toEqual({ tipo: 'sitio' });
    expect(decideEntry('/NO-EXISTE')).toEqual({ tipo: 'sitio' });
  });

  it('carga la aplicación en el ingreso, el panel y el portal', () => {
    expect(decideEntry('/ingresar')).toEqual({ tipo: 'aplicacion' });
    expect(decideEntry('/panel/causas/5')).toEqual({ tipo: 'aplicacion' });
  });

  it('lleva una dirección con mayúsculas a la principal, conservando el "#"', () => {
    expect(decideEntry('/Servicios/Sucesiones', '#contacto')).toEqual({
      tipo: 'redirigir',
      destino: '/servicios/sucesiones#contacto',
    });
  });

  it('una redirección que ya tiene "#" no suma otro', () => {
    expect(decideEntry('/servicios', '#contacto')).toEqual({
      tipo: 'redirigir',
      destino: '/#servicios',
    });
  });

  it('lleva una dirección de la aplicación con mayúsculas a la principal', () => {
    expect(decideEntry('/PANEL')).toEqual({ tipo: 'redirigir', destino: '/panel' });
  });
});
