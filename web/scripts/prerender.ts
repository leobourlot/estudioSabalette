/**
 * Prerenderizado del sitio público (spec 007, RF-35; plan 007, "Cómo se publica el sitio"). Corre
 * después de `vite build` y `vite build --ssr`: con la versión del sitio para Node escribe en
 * dist/ un HTML completo por página pública, 404.html, app.html, sitemap.xml y robots.txt, y
 * borra dist-ssr/. Lo que se escribe lo arma buildSiteFiles (src/servicios/archivos-sitio.ts),
 * que tiene sus tests; este script solo lee y escribe archivos.
 *
 * Node 24 lo ejecuta sin compilar: solo usa sintaxis de TypeScript que se puede borrar.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';

interface ServerEntry {
  renderPublicPage: (ruta: string) => string;
  buildSiteFiles: (
    plantilla: string,
    urlSitio: string,
    render: (ruta: string) => string,
  ) => Map<string, string>;
}

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(webDir, 'dist');
const ssrDir = join(webDir, 'dist-ssr');

// Como Vite: las variables del entorno y las de los archivos .env de web/.
const urlSitio = loadEnv('production', webDir, 'VITE_').VITE_URL_SITIO ?? '';
if (urlSitio === '') {
  console.error(
    'Falta VITE_URL_SITIO: la dirección pública del sitio, con https:// y sin barra final (ver web/.env.example).',
  );
  process.exit(1);
}

const entry = (await import(
  pathToFileURL(join(ssrDir, 'entrada-servidor.js')).href
)) as ServerEntry;
const plantilla = await readFile(join(distDir, 'index.html'), 'utf8');
const files = entry.buildSiteFiles(plantilla, urlSitio, entry.renderPublicPage);

for (const [archivo, contenido] of files) {
  const path = join(distDir, archivo);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contenido, 'utf8');
}
await rm(ssrDir, { recursive: true, force: true });

console.log(`Prerenderizado: ${files.size} archivos en dist/ para ${urlSitio}`);
