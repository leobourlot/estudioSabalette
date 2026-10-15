import { describe, expect, it } from 'vitest';
import htaccess from '../public/.htaccess?raw';

/**
 * El .htaccess de Hostinger (plan 007, ".htaccess"). Este test no ejecuta Apache: verifica que
 * estén las reglas del plan. Su comportamiento real se verifica al publicar (T33).
 */

const lines = htaccess
  .replace(/\r\n/g, '\n')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'));

const has = (line: string) => expect(lines).toContain(line);

describe('.htaccess (spec 007, RF-8 a RF-10, RF-25, RF-38 y RF-43)', () => {
  it('una dirección inexistente responde 404 con su página, sin listados de carpetas (RF-9, RF-38)', () => {
    has('ErrorDocument 404 /404.html');
    has('Options -Indexes');
    has('DirectorySlash Off');
  });

  it('conserva la dirección única del plan 004, antes que las demás reglas', () => {
    const https = lines.indexOf('RewriteRule ^ https://%1%{REQUEST_URI} [R=302,L]');

    expect(https).toBeGreaterThan(-1);
    expect(https).toBeLessThan(lines.indexOf('RewriteRule ^(.+)/$ /$1 [R=302,L]'));
  });

  it('redirige la barra final, /servicios, /abogadas y Derecho Laboral sin pestaña (RF-8)', () => {
    has('RewriteRule ^(.+)/$ /$1 [R=302,L]');
    has('RewriteRule ^servicios$ /#servicios [R=302,NE,L]');
    has('RewriteRule ^abogadas$ /#abogadas [R=302,NE,L]');
    has('RewriteRule ^servicios/derecho-laboral$ /servicios/derecho-laboral/empresas [R=302,L]');
  });

  it('sirve la aplicación con app.html, exista o no la dirección (RF-10)', () => {
    has('RewriteRule ^(ingresar|cambiar-contrasena)$ /app.html [L]');
    has('RewriteRule ^(panel|portal)(/.*)?$ /app.html [L]');
  });

  it('sirve las páginas prerenderizadas sin .html en la dirección', () => {
    const condition = lines.indexOf('RewriteCond %{DOCUMENT_ROOT}/$1.html -f');

    expect(lines[condition + 1]).toBe('RewriteRule ^(.+)$ /$1.html [L]');
  });

  it('no deja mostrar ninguna pantalla dentro de otro sitio (RF-43)', () => {
    has(`Header always set Content-Security-Policy "frame-ancestors 'none'"`);
    has('Header always set X-Frame-Options "DENY"');
  });

  it('no envía la dirección de origen a otros sitios (RF-25)', () => {
    has('Header always set Referrer-Policy "same-origin"');
  });

  it('app.html no se guarda ni se lista; 404.html no se lista (spec 004, RF-6; RF-38)', () => {
    const app = lines.indexOf('<Files "app.html">');
    expect(lines.slice(app + 1, app + 3)).toEqual([
      'Header set Cache-Control "no-store"',
      'Header set X-Robots-Tag "noindex"',
    ]);
    const notFound = lines.indexOf('<Files "404.html">');
    expect(lines[notFound + 1]).toBe('Header set X-Robots-Tag "noindex"');
  });

  it('las páginas públicas se guardan pero se revisan', () => {
    const pages = lines.indexOf('<FilesMatch "^(?!app\\.html$).+\\.html$">');

    expect(lines[pages + 1]).toBe('Header set Cache-Control "no-cache"');
  });

  it('ya no sirve index.html para cualquier dirección', () => {
    expect(lines).not.toContain('RewriteRule . /index.html [L]');
  });
});
