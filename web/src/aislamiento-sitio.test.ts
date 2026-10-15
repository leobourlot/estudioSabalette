import { describe, expect, it } from 'vitest';

/**
 * Spec 007, RF-36 y RF-39 a RF-41: el sitio público no pide ni guarda datos de quien lo visita,
 * no lo sigue, y nunca usa datos de causas, clientes, cuentas, jurisprudencia, modelos ni
 * escritos. Lo único que sabe de la sesión lo consulta estado-sesion.ts. Este test lee el código
 * del sitio público y falla si importa algo que no sea del propio sitio (una lista cerrada), si
 * usa almacenamiento del navegador, si tiene campos para escribir o si carga recursos de otros
 * sitios. El control real del servidor está en los e2e de /api/sesion/estado.
 */

// Contenido de todos los archivos fuente, por su ruta relativa a src/.
const sources = import.meta.glob<string>(['./**/*.ts', './**/*.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Los módulos del sitio público, por nombre de archivo sin extensión. */
const SITE_MODULES = new Set([
  // Arranque, árbol y rutas.
  'entrada-sitio',
  'entrada-servidor',
  'SitioPublico',
  'RutasSitio',
  // Páginas.
  'SitioInicio',
  'SitioServicio',
  'SitioDerechoLaboral',
  'SitioAbogada',
  'SitioNoEncontrada',
  // Componentes.
  'AccesoIngreso',
  'BloquesTexto',
  'BotonWhatsapp',
  'ContactoSitio',
  'DisenoSitio',
  'EncabezadoSitio',
  'FotoAbogada',
  'IconosContacto',
  'IconosRedes',
  'MenuSitio',
  'NombreEstudio',
  'OtrosServicios',
  'TarjetaAbogada',
  'TarjetaServicio',
  'VolverA',
  'estilos-sitio',
  'useFocoEnAncla',
  'useTituloDocumento',
  // Servicios.
  'archivos-sitio',
  'cabecera-pagina',
  'contenido-sitio',
  'datos-estudio',
  'estado-sesion',
  'marca',
  'presentacion-sitio',
  'rutas-sitio',
]);

/** Paquetes que el sitio puede usar. */
const ALLOWED_PACKAGES = new Set([
  'react',
  'react-dom/client',
  'react-dom/server',
  'react-router-dom',
]);

const moduleName = (path: string) =>
  path
    .split('/')
    .at(-1)!
    .replace(/\.(tsx?|jsx?)$/, '');

const isTest = (path: string) => /\.test\.|\/pruebas\//.test(path);

/** Archivos propios del sitio público, sin sus tests. */
const siteFiles = Object.entries(sources).filter(
  ([path]) => !isTest(path) && SITE_MODULES.has(moduleName(path)),
);

/** Lo que importa un archivo: rutas relativas y paquetes, también con import(). */
function importsOf(content: string): string[] {
  return Array.from(
    content.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g),
    (match) => match[1],
  );
}

/** Lo que un archivo importa y no es del sitio ni un paquete permitido. */
function forbiddenImports(content: string): string[] {
  return importsOf(content).filter((specifier) =>
    specifier.startsWith('.')
      ? !SITE_MODULES.has(moduleName(specifier.replace(/\?.*$/, '')))
      : !ALLOWED_PACKAGES.has(specifier),
  );
}

const STORAGE = /\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie/;
const FIELDS = /<(input|textarea|select)\b/;
const EXTERNAL_RESOURCE = /\bsrc=\{?\s*['"`]https?:|<link\b|<script\b|<iframe\b/;

describe('aislamiento del sitio público (spec 007, RF-36, RF-39 a RF-41)', () => {
  it('encuentra los archivos del sitio', () => {
    expect(siteFiles.map(([path]) => moduleName(path)).sort()).toEqual([...SITE_MODULES].sort());
  });

  it('solo importa módulos del propio sitio y los paquetes permitidos', () => {
    const offenders = siteFiles
      .map(([path, content]) => [path, forbiddenImports(content)] as const)
      .filter(([, forbidden]) => forbidden.length > 0);

    expect(offenders).toEqual([]);
  });

  it('no usa almacenamiento del navegador ni cookies (RF-39)', () => {
    const offenders = siteFiles.filter(([, content]) => STORAGE.test(content)).map(([p]) => p);

    expect(offenders).toEqual([]);
  });

  it('no tiene campos para escribir (RF-39)', () => {
    const offenders = siteFiles.filter(([, content]) => FIELDS.test(content)).map(([p]) => p);

    expect(offenders).toEqual([]);
  });

  it('no carga recursos de otros sitios desde sus componentes (RF-40)', () => {
    const offenders = siteFiles
      .filter(([path]) => path.endsWith('.tsx'))
      .filter(([, content]) => EXTERNAL_RESOURCE.test(content))
      .map(([p]) => p);

    expect(offenders).toEqual([]);
  });
});

describe('las reglas detectan lo que prohíben (casos de control)', () => {
  it('detecta un servicio de la aplicación importado', () => {
    expect(forbiddenImports(`import { listCausas } from '../servicios/causas';`)).toEqual([
      '../servicios/causas',
    ]);
    expect(forbiddenImports(`import { useSession } from './ProveedorSesion';`)).toEqual([
      './ProveedorSesion',
    ]);
    expect(forbiddenImports(`import { sessionService } from '../servicios/sesion';`)).toEqual([
      '../servicios/sesion',
    ]);
    expect(forbiddenImports(`const m = await import('./entrada-aplicacion');`)).toEqual([
      './entrada-aplicacion',
    ]);
    expect(forbiddenImports(`import x from 'otra-biblioteca';`)).toEqual(['otra-biblioteca']);
  });

  it('acepta los módulos del sitio y los paquetes permitidos', () => {
    expect(
      forbiddenImports(
        `import { useState } from 'react';\nimport { TEXTOS } from '../servicios/contenido-sitio';`,
      ),
    ).toEqual([]);
  });

  it('detecta almacenamiento, campos y recursos externos', () => {
    expect(STORAGE.test('window.localStorage.setItem("a", "b")')).toBe(true);
    expect(STORAGE.test('document.cookie = "a=b"')).toBe(true);
    expect(FIELDS.test('<input name="email" />')).toBe(true);
    expect(EXTERNAL_RESOURCE.test('<img src="https://otro.sitio/pixel.gif" />')).toBe(true);
    expect(EXTERNAL_RESOURCE.test('<iframe title="Mapa" />')).toBe(true);
  });
});
