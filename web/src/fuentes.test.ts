/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import indexHtml from '../index.html?raw';

// Vitest no procesa CSS: la hoja de estilos y la configuración de Tailwind se leen como archivos,
// desde web/, donde corre la suite.
const indexCss = readFileSync('src/index.css', 'utf8');
const tailwindConfig = readFileSync('tailwind.config.js', 'utf8');

/**
 * Spec 007, RF-3 y RF-40: los títulos usan Cormorant Garamond, con sus archivos y su licencia
 * dentro del sitio. Ni la hoja de estilos ni index.html piden tipografías a otros sitios.
 */

const fonts = import.meta.glob('../public/fuentes/*', {
  query: '?url',
  import: 'default',
  eager: true,
});

describe('tipografía de los títulos (spec 007, RF-3 y RF-40)', () => {
  it('los archivos y la licencia están en el sitio', () => {
    expect(Object.keys(fonts).sort()).toEqual([
      '../public/fuentes/cormorant-garamond-OFL.txt',
      '../public/fuentes/cormorant-garamond-latin-500-normal.woff2',
      '../public/fuentes/cormorant-garamond-latin-600-normal.woff2',
    ]);
  });

  it('la hoja de estilos declara los dos pesos con archivos propios y font-display: swap', () => {
    const urls = Array.from(indexCss.matchAll(/url\('([^']+)'\)/g), (m) => m[1]);

    expect(urls).toEqual([
      '/fuentes/cormorant-garamond-latin-500-normal.woff2',
      '/fuentes/cormorant-garamond-latin-600-normal.woff2',
    ]);
    expect(indexCss.match(/font-display: swap;/g)).toHaveLength(2);
  });

  it('index.html precarga la tipografía propia y no pide nada a otros sitios', () => {
    expect(indexHtml).toContain('href="/fuentes/cormorant-garamond-latin-600-normal.woff2"');
    expect(indexHtml).not.toMatch(/(href|src)="https?:/);
    expect(indexCss).not.toMatch(/url\(['"]?https?:|@import/);
  });

  it('Tailwind ofrece la familia de los títulos', () => {
    expect(tailwindConfig).toContain("titulos: ['\"Cormorant Garamond\"', 'Georgia', 'serif']");
  });
});
