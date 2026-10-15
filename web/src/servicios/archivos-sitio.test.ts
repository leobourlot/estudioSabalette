import { describe, expect, it } from 'vitest';
import { renderPublicPage } from '../entrada-servidor';
import { buildSiteFiles, robotsTxt, SiteBuildError, sitemapXml } from './archivos-sitio';
import { PUBLIC_PAGES } from './rutas-sitio';

const SITE = 'https://ejemplo.test';
const TEMPLATE = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <!--cabecera-->
    <script type="module" src="/assets/index.js"></script>
  </head>
  <body>
    <div id="root"><!--app--></div>
  </body>
</html>`;

const files = buildSiteFiles(TEMPLATE, SITE, renderPublicPage);

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('buildSiteFiles (spec 007, RF-35, RF-37 y RF-38)', () => {
  it('genera un archivo por página pública, más 404.html, app.html, sitemap.xml y robots.txt', () => {
    expect([...files.keys()]).toEqual([
      ...PUBLIC_PAGES.map((p) => p.archivo),
      '404.html',
      'app.html',
      'sitemap.xml',
      'robots.txt',
    ]);
  });

  it.each(PUBLIC_PAGES.map((p) => [p.archivo, p] as const))(
    '%s trae su contenido, su cabecera y "Ingresar", sin ejecutar código',
    (archivo, pagina) => {
      const doc = parse(files.get(archivo)!);
      const root = doc.getElementById('root')!;

      expect(doc.title).toBe(pagina.titulo);
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('h1')!.textContent).not.toBe('No encontramos esa página');
      expect(root.querySelector('a[href="/ingresar"]')!.textContent).toBe('Ingresar');
      expect(root.textContent).not.toContain('Ir a mi portal');
      expect(root.textContent).not.toContain('Ir al panel');
      expect(doc.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe(
        SITE + pagina.ruta,
      );
      // La plantilla se conserva: el código de la página sigue cargándose.
      expect(doc.querySelector('script[src="/assets/index.js"]')).not.toBeNull();
    },
  );

  it('el inicio trae los textos y los enlaces de sus secciones', () => {
    const root = parse(files.get('index.html')!).getElementById('root')!;

    expect(root.querySelector('#servicios')).not.toBeNull();
    expect(root.querySelector('#abogadas')).not.toBeNull();
    expect(root.querySelector('#contacto')).not.toBeNull();
    expect(root.querySelector('a[href="/servicios/sucesiones"]')).not.toBeNull();
    expect(root.querySelector('a[href="/abogadas/vanesa-sabalette-rabello"]')).not.toBeNull();
  });

  it('cada pestaña de Derecho Laboral trae su contenido como página propia', () => {
    const empresas = parse(files.get('servicios/derecho-laboral/empresas.html')!);
    const trabajadores = parse(files.get('servicios/derecho-laboral/trabajadores.html')!);

    expect(empresas.body.textContent).toContain('Asesoramiento laboral preventivo');
    expect(trabajadores.body.textContent).toContain('Reclamos y procesos judiciales laborales.');
    expect(trabajadores.body.textContent).not.toContain('Asesoramiento laboral preventivo');
  });

  it('404.html trae la página inexistente y no se lista', () => {
    const doc = parse(files.get('404.html')!);

    expect(doc.getElementById('root')!.querySelector('h1')!.textContent).toBe(
      'No encontramos esa página',
    );
    expect(doc.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
  });

  it('app.html llega vacía y no se lista', () => {
    const doc = parse(files.get('app.html')!);

    expect(doc.getElementById('root')!.innerHTML).toBe('');
    expect(doc.querySelector('meta[name="robots"]')!.getAttribute('content')).toBe('noindex');
    expect(doc.title).toBe('Pertusatti | Sabalette - Abogadas');
  });

  it('rechaza una dirección del sitio que no sea https:// sin barra final', () => {
    for (const url of ['', 'http://ejemplo.test', 'https://ejemplo.test/', 'ejemplo.test']) {
      expect(() => buildSiteFiles(TEMPLATE, url, renderPublicPage)).toThrow(SiteBuildError);
    }
  });

  it('rechaza una plantilla sin las marcas', () => {
    expect(() => buildSiteFiles('<html></html>', SITE, renderPublicPage)).toThrow(
      'index.html debe tener la marca <!--cabecera--> una sola vez',
    );
  });

  it('un "$" del contenido no se interpreta como patrón de reemplazo', () => {
    const built = buildSiteFiles(TEMPLATE, SITE, () => '<p>Precio $& y $1</p>');

    expect(built.get('index.html')).toContain('<p>Precio $& y $1</p>');
  });
});

describe('sitemap.xml y robots.txt (RF-37 y RF-38)', () => {
  it('el mapa del sitio lista solo las páginas indexables, con la dirección del sitio', () => {
    const doc = new DOMParser().parseFromString(sitemapXml(SITE), 'application/xml');

    expect(Array.from(doc.getElementsByTagName('loc')).map((loc) => loc.textContent)).toEqual(
      PUBLIC_PAGES.map((p) => SITE + p.ruta),
    );
  });

  it('robots.txt pide no listar las pantallas privadas y apunta al mapa del sitio', () => {
    expect(robotsTxt(SITE)).toBe(
      [
        'User-agent: *',
        'Disallow: /ingresar',
        'Disallow: /cambiar-contrasena',
        'Disallow: /panel',
        'Disallow: /portal',
        'Disallow: /app.html',
        'Disallow: /404.html',
        '',
        'Sitemap: https://ejemplo.test/sitemap.xml',
        '',
      ].join('\n'),
    );
  });
});
