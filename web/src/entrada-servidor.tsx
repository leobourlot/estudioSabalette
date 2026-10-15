import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { SitioPublico } from './SitioPublico';

/**
 * Entrada del prerenderizado (plan 007, "Cómo se publica el sitio"). Vite la construye para Node
 * (vite build --ssr) y scripts/prerender.ts la usa para escribir el HTML de cada página pública.
 */

/** El HTML de una dirección del sitio público, como lo muestra el primer render del navegador. */
export function renderPublicPage(ruta: string): string {
  return renderToString(
    <StaticRouter location={ruta}>
      <SitioPublico />
    </StaticRouter>,
  );
}

export { buildSiteFiles, SiteBuildError } from './servicios/archivos-sitio';
