import { describe, expect, it } from 'vitest';
import { buildHead, escapeHtml, jsonForScript, legalServiceData } from './cabecera-pagina';
import { STUDIO_CONTACT, type StudioContact } from './datos-estudio';
import { NOT_FOUND_PAGE, PUBLIC_PAGES, publicPageFor } from './rutas-sitio';

const SITE = 'https://ejemplo.test';

/** Lee la cabecera con el DOM del navegador, como la leería un buscador. */
function parseHead(html: string): Document {
  return new DOMParser().parseFromString(`<html><head>${html}</head></html>`, 'text/html');
}

const metaContent = (doc: Document, selector: string) =>
  doc.querySelector(selector)?.getAttribute('content') ?? null;

describe('buildHead (RF-34, RF-36, RF-37)', () => {
  it.each(PUBLIC_PAGES.map((p) => [p.ruta, p] as const))(
    'arma título, descripción, dirección principal y vista previa de %s',
    (ruta, pagina) => {
      const doc = parseHead(buildHead(pagina, SITE));

      expect(doc.title).toBe(pagina.titulo);
      expect(metaContent(doc, 'meta[name="description"]')).toBe(pagina.descripcion);
      expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(SITE + ruta);
      expect(metaContent(doc, 'meta[property="og:title"]')).toBe(pagina.titulo);
      expect(metaContent(doc, 'meta[property="og:description"]')).toBe(pagina.descripcion);
      expect(metaContent(doc, 'meta[property="og:url"]')).toBe(SITE + ruta);
      expect(metaContent(doc, 'meta[property="og:image"]')).toBe(`${SITE}/marca/compartir.png`);
      expect(metaContent(doc, 'meta[property="og:image:alt"]')).toBe(STUDIO_CONTACT.nombre);
      expect(metaContent(doc, 'meta[property="og:site_name"]')).toBe(STUDIO_CONTACT.nombre);
      expect(metaContent(doc, 'meta[property="og:locale"]')).toBe('es_AR');
      expect(metaContent(doc, 'meta[property="og:type"]')).toBe('website');
      expect(metaContent(doc, 'meta[name="twitter:card"]')).toBe('summary_large_image');
      expect(doc.querySelector('meta[name="robots"]')).toBeNull();
    },
  );

  it('la página inexistente no se lista ni se comparte (RF-38)', () => {
    const doc = parseHead(buildHead(NOT_FOUND_PAGE, SITE));

    expect(doc.title).toBe(NOT_FOUND_PAGE.titulo);
    expect(metaContent(doc, 'meta[name="robots"]')).toBe('noindex');
    expect(doc.querySelector('meta[name="description"]')).toBeNull();
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.querySelector('meta[property^="og:"]')).toBeNull();
  });

  it('una pantalla de la aplicación no se lista (RF-38)', () => {
    const app = {
      ruta: '/app',
      titulo: STUDIO_CONTACT.nombre,
      descripcion: null,
      indexable: false,
    };
    const doc = parseHead(buildHead(app, SITE));

    expect(metaContent(doc, 'meta[name="robots"]')).toBe('noindex');
    expect(doc.querySelector('script')).toBeNull();
  });

  it('solo el inicio lleva los datos del estudio para buscadores', () => {
    const scripts = PUBLIC_PAGES.map(
      (p) =>
        parseHead(buildHead(p, SITE)).querySelectorAll('script[type="application/ld+json"]').length,
    );

    expect(scripts).toEqual([1, 0, 0, 0, 0, 0, 0]);
    const doc = parseHead(buildHead(publicPageFor('/')!, SITE));
    const data = JSON.parse(doc.querySelector('script')!.textContent!);
    expect(data).toEqual(legalServiceData(SITE));
  });

  it('escapa los valores: ningún texto puede abrir otra etiqueta', () => {
    const pagina = {
      ruta: '/x',
      titulo: 'A & B <script>alert(1)</script>',
      descripcion: 'Dice "hola" y \'chau\' <b>',
      indexable: true,
    };
    const html = buildHead(pagina, SITE);
    const doc = parseHead(html);

    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<b>');
    expect(doc.title).toBe(pagina.titulo);
    expect(metaContent(doc, 'meta[name="description"]')).toBe(pagina.descripcion);
  });
});

describe('legalServiceData (RF-37)', () => {
  it('con los datos de hoy lleva nombre, dirección del sitio, teléfono, logo, dirección, email y redes, sin horarios', () => {
    expect(legalServiceData(SITE)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'LegalService',
      name: 'Pertusatti | Sabalette - Abogadas',
      url: `${SITE}/`,
      telephone: '+5493455414147',
      logo: `${SITE}/marca/logo.png`,
      image: `${SITE}/marca/logo.png`,
      address: { '@type': 'PostalAddress', streetAddress: 'Pueyrredón Nº 47, Concordia' },
      email: 'estudiojuridicovsr@gmail.com',
      sameAs: ['https://www.instagram.com/pertusattisabaletteabogadas/'],
    });
  });

  it('suma dirección, horarios, email y redes cuando el estudio los informa', () => {
    const contact: StudioContact = {
      ...STUDIO_CONTACT,
      direccion: 'San Martín 123, Villaguay',
      horarios: ['Lunes a viernes de 8 a 13'],
      email: 'estudio@ejemplo.test',
      redes: [{ red: 'Instagram', usuario: '@estudio', url: 'https://instagram.com/estudio' }],
    };

    expect(legalServiceData(SITE, contact)).toMatchObject({
      address: { '@type': 'PostalAddress', streetAddress: 'San Martín 123, Villaguay' },
      openingHours: ['Lunes a viernes de 8 a 13'],
      email: 'estudio@ejemplo.test',
      sameAs: ['https://instagram.com/estudio'],
    });
  });
});

describe('escapes', () => {
  it('escapeHtml escapa &, <, >, comillas dobles y simples', () => {
    expect(escapeHtml(`a & <b> "c" 'd'`)).toBe('a &amp; &lt;b&gt; &quot;c&quot; &#39;d&#39;');
  });

  it('jsonForScript no deja ningún "<" y sigue siendo el mismo JSON', () => {
    const data = { texto: '</script><script>alert(1)</script>' };
    const json = jsonForScript(data);

    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual(data);
  });
});
